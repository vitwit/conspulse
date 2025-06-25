package main

import (
	"archive/tar"
	"archive/zip"
	"bytes"
	"compress/gzip"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"reflect"
	"sort"
	"strings"

	"cosmossdk.io/log"
	"cosmossdk.io/store"
	"cosmossdk.io/store/metrics"
	"cosmossdk.io/store/rootmulti"
	dbm "github.com/cosmos/cosmos-db"
	"github.com/cosmos/iavl"
)

func main() {
	if len(os.Args) != 3 {
		fmt.Println("Usage: compare_stores <data_dir_1|url> <data_dir_2|url>")
		os.Exit(1)
	}

	dir1, cleanup1, err := getLocalOrDownload(os.Args[1])
	if err != nil {
		panic(err)
	}
	defer cleanup1()

	dir2, cleanup2, err := getLocalOrDownload(os.Args[2])
	if err != nil {
		panic(err)
	}
	defer cleanup2()

	db1, err := dbm.NewDB("application", dbm.GoLevelDBBackend, dir1)
	if err != nil {
		panic(err)
	}
	defer db1.Close()

	db2, err := dbm.NewDB("application", dbm.GoLevelDBBackend, dir2)
	if err != nil {
		panic(err)
	}
	defer db2.Close()

	// Load commit multi-store for each
	ms1 := store.NewCommitMultiStore(db1, log.NewNopLogger(), metrics.NewNoOpMetrics()).(*rootmulti.Store)
	ms2 := store.NewCommitMultiStore(db2, log.NewNopLogger(), metrics.NewNoOpMetrics()).(*rootmulti.Store)

	ver1 := ms1.LatestVersion()
	ver2 := ms2.LatestVersion()
	fmt.Printf("DataDir1 LatestVersion: %d\n", ver1)
	fmt.Printf("DataDir2 LatestVersion: %d\n", ver2)

	commitInfo1, err := ms1.GetCommitInfo(ver1)
	if err != nil {
		panic(err)
	}
	commitInfo2, err := ms2.GetCommitInfo(ver2)
	if err != nil {
		panic(err)
	}

	stores1 := map[string][]byte{}
	stores2 := map[string][]byte{}
	for _, s := range commitInfo1.StoreInfos {
		stores1[s.Name] = s.GetHash()
	}
	for _, s := range commitInfo2.StoreInfos {
		stores2[s.Name] = s.GetHash()
	}

	// Union of all store names for easy reporting
	allStores := map[string]bool{}
	for k := range stores1 {
		allStores[k] = true
	}
	for k := range stores2 {
		allStores[k] = true
	}

	var names []string
	for k := range allStores {
		names = append(names, k)
	}
	sort.Strings(names)

	fmt.Println("Store root hash comparison:")
	for _, name := range names {
		h1, ok1 := stores1[name]
		h2, ok2 := stores2[name]

		switch {
		case !ok1:
			fmt.Printf("Store %s only in Dir2\n\n", name)
		case !ok2:
			fmt.Printf("Store %s only in Dir1\n\n", name)
		case bytes.Equal(h1, h2):
			//fmt.Printf("Store %s: hashes match: %x\n", name, h1)
		default:
			fmt.Printf("Store %s: hashes differ!\n  Dir1: %x\n  Dir2: %x\n\n", name, h1, h2)
			// Try to dig into the IAVL tree!
			findIAVLTreeDiff(ms1, ms2, name, ver1, ver2)
		}
	}
}

func findIAVLTreeDiff(ms1, ms2 *rootmulti.Store, storeName string, ver1, ver2 int64) {
	fmt.Printf("Checking store %s\n", storeName)

	s1 := ms1.GetStoreByName(storeName)
	if s1 == nil {
		fmt.Printf("  Store %s not found in Dir1 (ms1)\n", storeName)
	}
	s2 := ms2.GetStoreByName(storeName)
	if s2 == nil {
		fmt.Printf("  Store %s not found in Dir2 (ms2)\n", storeName)
	}

	// Only try for IAVL stores (not memory, transient, etc.)
	t1, ok1 := s1.(interface{ GetImmutableTree() *iavl.ImmutableTree })
	t2, ok2 := s2.(interface{ GetImmutableTree() *iavl.ImmutableTree })
	if !ok1 || !ok2 {
		fmt.Printf("  Cannot dig: store %s is not IAVL.\n", storeName)
		fmt.Printf("    Dir1 store type: %T\n", s1)
		fmt.Printf("    Dir2 store type: %T\n", s2)
		fmt.Printf("    Dir1 concrete type: %v\n", reflect.TypeOf(s1))
		fmt.Printf("    Dir2 concrete type: %v\n", reflect.TypeOf(s2))
		return
	}

	tree1 := t1.GetImmutableTree()
	tree2 := t2.GetImmutableTree()

	itr1, err := tree1.Iterator(nil, nil, true)
	if err != nil {
		fmt.Printf("  Error creating iterator for store %s in dir1: %v\n", storeName, err)
		return
	}
	itr2, err := tree2.Iterator(nil, nil, true)
	if err != nil {
		fmt.Printf("  Error creating iterator for store %s in dir2: %v\n", storeName, err)
		return
	}
	defer itr1.Close()
	defer itr2.Close()

	for itr1.Valid() && itr2.Valid() {
		k1, v1 := itr1.Key(), itr1.Value()
		k2, v2 := itr2.Key(), itr2.Value()

		if !bytes.Equal(k1, k2) {
			fmt.Printf("  First differing key:\n    Dir1: %x\n    Dir2: %x\n", k1, k2)
			return
		}
		if !bytes.Equal(v1, v2) {
			fmt.Printf("  First differing value at key %x:\n    Dir1: %x\n    Dir2: %x\n", k1, v1, v2)
			return
		}
		itr1.Next()
		itr2.Next()
	}

	if itr1.Valid() || itr2.Valid() {
		fmt.Println("  One store has more keys than the other")
	} else {
		fmt.Println("  Trees structure matches but root hash still differs (possible bug in IAVL or store versioning)")
	}
}

func getLocalOrDownload(pathOrURL string) (string, func(), error) {
	if strings.HasPrefix(pathOrURL, "http://") || strings.HasPrefix(pathOrURL, "https://") {
		// Download
		resp, err := http.Get(pathOrURL)
		if err != nil {
			return "", func() {}, fmt.Errorf("failed to download %s: %w", pathOrURL, err)
		}
		defer resp.Body.Close()
		if resp.StatusCode != 200 {
			return "", func() {}, fmt.Errorf("failed to download %s: status %d", pathOrURL, resp.StatusCode)
		}
		// Create temp file
		tmpFile, err := os.CreateTemp("", "conspulse_download_*")
		if err != nil {
			return "", func() {}, err
		}
		defer tmpFile.Close()
		_, err = io.Copy(tmpFile, resp.Body)
		if err != nil {
			return "", func() {}, err
		}
		// Extract
		tmpDir, err := os.MkdirTemp("", "conspulse_extract_*")
		if err != nil {
			return "", func() {}, err
		}
		// Detect file type
		name := pathOrURL
		if strings.HasSuffix(name, ".zip") {
			err = unzip(tmpFile.Name(), tmpDir)
		} else if strings.HasSuffix(name, ".tar.gz") || strings.HasSuffix(name, ".tgz") {
			err = untarGz(tmpFile.Name(), tmpDir)
		} else {
			return "", func() {}, fmt.Errorf("unsupported archive type: %s", name)
		}
		if err != nil {
			return "", func() {}, err
		}
		cleanup := func() {
			os.RemoveAll(tmpDir)
			os.Remove(tmpFile.Name())
		}
		// Find the first directory in tmpDir (assume archive extracts to a single dir)
		entries, err := os.ReadDir(tmpDir)
		if err != nil || len(entries) == 0 {
			return "", cleanup, fmt.Errorf("no files extracted from archive")
		}
		first := filepath.Join(tmpDir, entries[0].Name())
		info, err := os.Stat(first)
		if err == nil && info.IsDir() {
			return first, cleanup, nil
		}
		return tmpDir, cleanup, nil
	}
	// Local path
	return pathOrURL, func() {}, nil
}

func unzip(src, dest string) error {
	r, err := zip.OpenReader(src)
	if err != nil {
		return err
	}
	defer r.Close()
	for _, f := range r.File {
		fpath := filepath.Join(dest, f.Name)
		if f.FileInfo().IsDir() {
			os.MkdirAll(fpath, 0755)
			continue
		}
		if err := os.MkdirAll(filepath.Dir(fpath), 0755); err != nil {
			return err
		}
		outFile, err := os.OpenFile(fpath, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, f.Mode())
		if err != nil {
			return err
		}
		rc, err := f.Open()
		if err != nil {
			outFile.Close()
			return err
		}
		_, err = io.Copy(outFile, rc)
		outFile.Close()
		rc.Close()
		if err != nil {
			return err
		}
	}
	return nil
}

func untarGz(src, dest string) error {
	f, err := os.Open(src)
	if err != nil {
		return err
	}
	defer f.Close()
	gz, err := gzip.NewReader(f)
	if err != nil {
		return err
	}
	defer gz.Close()
	tr := tar.NewReader(gz)
	for {
		hdr, err := tr.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			return err
		}
		target := filepath.Join(dest, hdr.Name)
		switch hdr.Typeflag {
		case tar.TypeDir:
			if err := os.MkdirAll(target, 0755); err != nil {
				return err
			}
		case tar.TypeReg:
			if err := os.MkdirAll(filepath.Dir(target), 0755); err != nil {
				return err
			}
			outFile, err := os.Create(target)
			if err != nil {
				return err
			}
			if _, err := io.Copy(outFile, tr); err != nil {
				outFile.Close()
				return err
			}
			outFile.Close()
		}
	}
	return nil
}
