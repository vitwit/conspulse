package main

import (
	"archive/zip"
	"bytes"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"cosmossdk.io/log"
	"cosmossdk.io/store"
	"cosmossdk.io/store/metrics"
	"cosmossdk.io/store/rootmulti"
	storetypes "cosmossdk.io/store/types"
	dbm "github.com/cosmos/cosmos-db"
	"github.com/cosmos/iavl"
)

type DataSource struct {
	Path   string
	IsTemp bool // Whether to clean up after use
}

func main() {
	if len(os.Args) != 3 {
		fmt.Println("Usage: compare_stores <source1> <source2>")
		fmt.Println("Sources can be:")
		fmt.Println("  - Local directory path")
		fmt.Println("  - ZIP file path")
		fmt.Println("  - HTTP/HTTPS URL to ZIP file")
		os.Exit(1)
	}

	source1, err := prepareDataSource(os.Args[1])
	if err != nil {
		fmt.Printf("Error preparing source1: %v\n", err)
		os.Exit(1)
	}
	defer cleanupSource(source1)

	source2, err := prepareDataSource(os.Args[2])
	if err != nil {
		fmt.Printf("Error preparing source2: %v\n", err)
		os.Exit(1)
	}
	defer cleanupSource(source2)

	compareStores(source1.Path, source2.Path)
}

func prepareDataSource(input string) (*DataSource, error) {
	// Check if it's a URL
	if strings.HasPrefix(input, "http://") || strings.HasPrefix(input, "https://") {
		fmt.Printf("Downloading ZIP from URL: %s\n", input)
		return downloadAndExtractZip(input)
	}

	// Check if it's a local zip file
	if strings.HasSuffix(strings.ToLower(input), ".zip") {
		if _, err := os.Stat(input); err == nil {
			fmt.Printf("Extracting local ZIP: %s\n", input)
			return extractLocalZip(input)
		}
	}

	// Assume it's a local directory
	if _, err := os.Stat(input); err != nil {
		return nil, fmt.Errorf("path does not exist: %s", input)
	}

	return &DataSource{Path: input, IsTemp: false}, nil
}

func downloadAndExtractZip(url string) (*DataSource, error) {
	// Create temporary directory
	tempDir, err := os.MkdirTemp("", "store-compare-*")
	if err != nil {
		return nil, fmt.Errorf("failed to create temp directory: %v", err)
	}

	// Download the file
	client := &http.Client{Timeout: 30 * time.Minute}
	resp, err := client.Get(url)
	if err != nil {
		os.RemoveAll(tempDir)
		return nil, fmt.Errorf("failed to download ZIP: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		os.RemoveAll(tempDir)
		return nil, fmt.Errorf("failed to download ZIP: HTTP %d", resp.StatusCode)
	}

	// Read the response body
	zipData, err := io.ReadAll(resp.Body)
	if err != nil {
		os.RemoveAll(tempDir)
		return nil, fmt.Errorf("failed to read ZIP data: %v", err)
	}

	// Extract the ZIP
	extractDir := filepath.Join(tempDir, "extracted")
	err = extractZipFromBytes(zipData, extractDir)
	if err != nil {
		os.RemoveAll(tempDir)
		return nil, fmt.Errorf("failed to extract ZIP: %v", err)
	}

	return &DataSource{Path: extractDir, IsTemp: true}, nil
}

func extractLocalZip(zipPath string) (*DataSource, error) {
	// Create temporary directory
	tempDir, err := os.MkdirTemp("", "store-compare-*")
	if err != nil {
		return nil, fmt.Errorf("failed to create temp directory: %v", err)
	}

	// Read the ZIP file
	zipData, err := os.ReadFile(zipPath)
	if err != nil {
		os.RemoveAll(tempDir)
		return nil, fmt.Errorf("failed to read ZIP file: %v", err)
	}

	// Extract the ZIP
	extractDir := filepath.Join(tempDir, "extracted")
	err = extractZipFromBytes(zipData, extractDir)
	if err != nil {
		os.RemoveAll(tempDir)
		return nil, fmt.Errorf("failed to extract ZIP: %v", err)
	}

	return &DataSource{Path: extractDir, IsTemp: true}, nil
}

func extractZipFromBytes(zipData []byte, destDir string) error {
	reader, err := zip.NewReader(bytes.NewReader(zipData), int64(len(zipData)))
	if err != nil {
		return err
	}

	err = os.MkdirAll(destDir, 0755)
	if err != nil {
		return err
	}

	for _, file := range reader.File {
		path := filepath.Join(destDir, file.Name)

		// Security check: ensure the file path is within destDir
		if !strings.HasPrefix(path, filepath.Clean(destDir)+string(os.PathSeparator)) {
			return fmt.Errorf("invalid file path in ZIP: %s", file.Name)
		}

		if file.FileInfo().IsDir() {
			os.MkdirAll(path, file.FileInfo().Mode())
			continue
		}

		// Create the directories for this file
		if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
			return err
		}

		// Extract the file
		fileReader, err := file.Open()
		if err != nil {
			return err
		}

		targetFile, err := os.OpenFile(path, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, file.FileInfo().Mode())
		if err != nil {
			fileReader.Close()
			return err
		}

		_, err = io.Copy(targetFile, fileReader)
		fileReader.Close()
		targetFile.Close()
		if err != nil {
			return err
		}
	}

	return nil
}

func cleanupSource(source *DataSource) {
	if source.IsTemp {
		os.RemoveAll(source.Path)
	}
}

func compareStores(dataDir1, dataDir2 string) {
	// Open both databases
	db1, err := dbm.NewDB("application", dbm.GoLevelDBBackend, dataDir1)
	if err != nil {
		fmt.Printf("Error opening database in %s: %v\n", dataDir1, err)
		return
	}
	defer db1.Close()

	db2, err := dbm.NewDB("application", dbm.GoLevelDBBackend, dataDir2)
	if err != nil {
		fmt.Printf("Error opening database in %s: %v\n", dataDir2, err)
		return
	}
	defer db2.Close()

	// Load commit multi-store for each
	ms1 := store.NewCommitMultiStore(db1, log.NewNopLogger(), metrics.NewNoOpMetrics()).(*rootmulti.Store)
	ms2 := store.NewCommitMultiStore(db2, log.NewNopLogger(), metrics.NewNoOpMetrics()).(*rootmulti.Store)

	ver1 := ms1.LatestVersion()
	ver2 := ms2.LatestVersion()
	fmt.Printf("DataDir1 LatestVersion: %d\n", ver1)
	fmt.Printf("DataDir2 LatestVersion: %d\n", ver2)

	// Get commit info to discover all stores
	commitInfo1, err := ms1.GetCommitInfo(ver1)
	if err != nil {
		fmt.Printf("Error getting commit info for ms1: %v\n", err)
		return
	}
	commitInfo2, err := ms2.GetCommitInfo(ver2)
	if err != nil {
		fmt.Printf("Error getting commit info for ms2: %v\n", err)
		return
	}

	// Collect all store names and their hashes
	stores1 := map[string][]byte{}
	stores2 := map[string][]byte{}
	for _, s := range commitInfo1.StoreInfos {
		stores1[s.Name] = s.GetHash()
	}
	for _, s := range commitInfo2.StoreInfos {
		stores2[s.Name] = s.GetHash()
	}

	// Mount all stores that exist in either database
	allStoreNames := make(map[string]bool)
	for k := range stores1 {
		allStoreNames[k] = true
	}
	for k := range stores2 {
		allStoreNames[k] = true
	}

	// Mount stores with appropriate types
	for storeName := range allStoreNames {
		storeType := storetypes.StoreTypeIAVL

		// Adjust store types based on common patterns
		switch storeName {
		case "consensus_params", "upgrade":
			storeType = storetypes.StoreTypeIAVL
		default:
			storeType = storetypes.StoreTypeIAVL
		}

		ms1.MountStoreWithDB(storetypes.NewKVStoreKey(storeName), storeType, nil)
		ms2.MountStoreWithDB(storetypes.NewKVStoreKey(storeName), storeType, nil)
	}

	// Load the stores at the specific versions
	err = ms1.LoadVersion(ver1)
	if err != nil {
		fmt.Printf("Error loading version %d for ms1: %v\n", ver1, err)
	}

	err = ms2.LoadVersion(ver2)
	if err != nil {
		fmt.Printf("Error loading version %d for ms2: %v\n", ver2, err)
	}

	// Union of all store names for reporting
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

	fmt.Println("\nStore root hash comparison:")
	fmt.Println("=" + strings.Repeat("=", 50))

	matchingStores := 0
	differingStores := 0
	missingStores := 0

	for _, name := range names {
		h1, ok1 := stores1[name]
		h2, ok2 := stores2[name]

		switch {
		case !ok1:
			fmt.Printf("\n❌ Store '%s' ONLY EXISTS IN DIR2\n", name)
			fmt.Printf("   Dir2 hash: %x\n", h2)
			missingStores++
			// Try to show some data from the store that exists
			showStoreInfo(ms2, name, "Dir2")

		case !ok2:
			fmt.Printf("\n❌ Store '%s' ONLY EXISTS IN DIR1\n", name)
			fmt.Printf("   Dir1 hash: %x\n", h1)
			missingStores++
			// Try to show some data from the store that exists
			showStoreInfo(ms1, name, "Dir1")

		case bytes.Equal(h1, h2):
			fmt.Printf("✅ Store '%s': hashes match (%x)\n", name, h1)
			matchingStores++

		default:
			fmt.Printf("\n🔍 Store '%s': HASHES DIFFER!\n", name)
			fmt.Printf("   Dir1: %x\n", name, h1)
			fmt.Printf("   Dir2: %x\n", name, h2)
			differingStores++
			// Try to dig into the differences
			findIAVLTreeDiff(ms1, ms2, name, ver1, ver2)
		}
	}

	// Summary
	fmt.Println("\n" + strings.Repeat("=", 60))
	fmt.Printf("COMPARISON SUMMARY:\n")
	fmt.Printf("  ✅ Matching stores: %d\n", matchingStores)
	fmt.Printf("  🔍 Differing stores: %d\n", differingStores)
	fmt.Printf("  ❌ Missing stores: %d\n", missingStores)
	fmt.Printf("  📊 Total stores: %d\n", len(names))

	if differingStores == 0 && missingStores == 0 {
		fmt.Println("\n🎉 ALL STORES MATCH! The databases are identical.")
	} else {
		fmt.Printf("\n⚠️  Found %d differences that need attention.\n", differingStores+missingStores)
	}
}

func showStoreInfo(ms *rootmulti.Store, storeName, dirName string) {
	store := ms.GetStoreByName(storeName)
	if store == nil {
		fmt.Printf("   Cannot access store data (store not properly loaded)\n")
		return
	}

	fmt.Printf("   %s store type: %T\n", dirName, store)

	// Try to get some basic info about the store
	if kvStore, ok := store.(storetypes.KVStore); ok {
		// Try to get an iterator to see if there's any data
		iter := kvStore.Iterator(nil, nil)
		if iter != nil {
			defer iter.Close()
			count := 0
			for ; iter.Valid() && count < 3; iter.Next() {
				key := iter.Key()
				fmt.Printf("   Sample key: %x (%s)\n", key, string(key))
				count++
			}
			if count == 0 {
				fmt.Printf("   Store appears to be empty\n")
			}
		}
	}
}

func findIAVLTreeDiff(ms1, ms2 *rootmulti.Store, storeName string, ver1, ver2 int64) {
	fmt.Printf("   Analyzing differences in store '%s'...\n", storeName)

	s1 := ms1.GetStoreByName(storeName)
	s2 := ms2.GetStoreByName(storeName)

	if s1 == nil && s2 == nil {
		fmt.Printf("   ⚠️  Both stores are nil (not properly loaded)\n")
		return
	} else if s1 == nil {
		fmt.Printf("   ⚠️  Store not found in Dir1\n")
		return
	} else if s2 == nil {
		fmt.Printf("   ⚠️  Store not found in Dir2\n")
		return
	}

	fmt.Printf("   Dir1 store type: %T\n", s1)
	fmt.Printf("   Dir2 store type: %T\n", s2)

	// Try IAVL tree comparison first
	t1, ok1 := s1.(interface{ GetImmutableTree() *iavl.ImmutableTree })
	t2, ok2 := s2.(interface{ GetImmutableTree() *iavl.ImmutableTree })

	if ok1 && ok2 {
		tree1 := t1.GetImmutableTree()
		tree2 := t2.GetImmutableTree()

		if tree1 == nil || tree2 == nil {
			fmt.Printf("   ⚠️  One or both IAVL trees are nil\n")
		} else {
			compareIAVLTrees(tree1, tree2, storeName)
			return
		}
	}

	// Fallback to KVStore comparison
	if kv1, ok := s1.(storetypes.KVStore); ok {
		if kv2, ok := s2.(storetypes.KVStore); ok {
			compareKVStores(kv1, kv2, storeName)
			return
		}
	}

	fmt.Printf("   ❌ Cannot compare: unsupported store types\n")
}

func compareIAVLTrees(tree1, tree2 *iavl.ImmutableTree, storeName string) {
	itr1, err := tree1.Iterator(nil, nil, true)
	if err != nil {
		fmt.Printf("   Error creating iterator for tree1: %v\n", err)
		return
	}
	defer itr1.Close()

	itr2, err := tree2.Iterator(nil, nil, true)
	if err != nil {
		fmt.Printf("   Error creating iterator for tree2: %v\n", err)
		return
	}
	defer itr2.Close()

	diffCount := 0
	maxDiffsToShow := 5
	keyCount1, keyCount2 := 0, 0

	for (itr1.Valid() || itr2.Valid()) && diffCount < maxDiffsToShow {
		if !itr1.Valid() {
			keyCount2++
			k2, v2 := itr2.Key(), itr2.Value()
			fmt.Printf("   🔍 Key only in Dir2: %x (%s) = %x\n", k2, string(k2), v2)
			diffCount++
			itr2.Next()
			continue
		}

		if !itr2.Valid() {
			keyCount1++
			k1, v1 := itr1.Key(), itr1.Value()
			fmt.Printf("   🔍 Key only in Dir1: %x (%s) = %x\n", k1, string(k1), v1)
			diffCount++
			itr1.Next()
			continue
		}

		k1, v1 := itr1.Key(), itr1.Value()
		k2, v2 := itr2.Key(), itr2.Value()
		keyCount1++
		keyCount2++

		keyCompare := bytes.Compare(k1, k2)
		if keyCompare < 0 {
			fmt.Printf("   🔍 Key only in Dir1: %x (%s) = %x\n", k1, string(k1), v1)
			diffCount++
			itr1.Next()
			keyCount2-- // Adjust count since we didn't process k2
		} else if keyCompare > 0 {
			fmt.Printf("   🔍 Key only in Dir2: %x (%s) = %x\n", k2, string(k2), v2)
			diffCount++
			itr2.Next()
			keyCount1-- // Adjust count since we didn't process k1
		} else {
			// Same key, check values
			if !bytes.Equal(v1, v2) {
				fmt.Printf("   🔍 Value differs for key %x (%s):\n", k1, string(k1))
				fmt.Printf("      Dir1: %x\n", v1)
				fmt.Printf("      Dir2: %x\n", v2)
				diffCount++
			}
			itr1.Next()
			itr2.Next()
		}
	}

	// Count remaining keys
	for itr1.Valid() {
		keyCount1++
		itr1.Next()
	}
	for itr2.Valid() {
		keyCount2++
		itr2.Next()
	}

	fmt.Printf("   📊 Key counts - Dir1: %d, Dir2: %d\n", keyCount1, keyCount2)

	if diffCount >= maxDiffsToShow {
		fmt.Printf("   ... (showing first %d differences only)\n", maxDiffsToShow)
	} else if diffCount == 0 {
		fmt.Printf("   🤔 All key-value pairs match, but root hashes differ (versioning/metadata issue?)\n")
	}
}

func compareKVStores(kv1, kv2 storetypes.KVStore, storeName string) {
	fmt.Printf("   Comparing KVStores for '%s'...\n", storeName)

	iter1 := kv1.Iterator(nil, nil)
	if iter1 == nil {
		fmt.Printf("   Cannot create iterator for Dir1 KVStore\n")
		return
	}
	defer iter1.Close()

	iter2 := kv2.Iterator(nil, nil)
	if iter2 == nil {
		fmt.Printf("   Cannot create iterator for Dir2 KVStore\n")
		return
	}
	defer iter2.Close()

	diffCount := 0
	maxDiffsToShow := 5

	for (iter1.Valid() || iter2.Valid()) && diffCount < maxDiffsToShow {
		if !iter1.Valid() {
			k2, v2 := iter2.Key(), iter2.Value()
			fmt.Printf("   🔍 Key only in Dir2: %x (%s) = %x\n", k2, string(k2), v2)
			diffCount++
			iter2.Next()
			continue
		}

		if !iter2.Valid() {
			k1, v1 := iter1.Key(), iter1.Value()
			fmt.Printf("   🔍 Key only in Dir1: %x (%s) = %x\n", k1, string(k1), v1)
			diffCount++
			iter1.Next()
			continue
		}

		k1, v1 := iter1.Key(), iter1.Value()
		k2, v2 := iter2.Key(), iter2.Value()

		keyCompare := bytes.Compare(k1, k2)
		if keyCompare < 0 {
			fmt.Printf("   🔍 Key only in Dir1: %x (%s) = %x\n", k1, string(k1), v1)
			diffCount++
			iter1.Next()
		} else if keyCompare > 0 {
			fmt.Printf("   🔍 Key only in Dir2: %x (%s) = %x\n", k2, string(k2), v2)
			diffCount++
			iter2.Next()
		} else {
			if !bytes.Equal(v1, v2) {
				fmt.Printf("   🔍 Value differs for key %x (%s):\n", k1, string(k1))
				fmt.Printf("      Dir1: %x\n", v1)
				fmt.Printf("      Dir2: %x\n", v2)
				diffCount++
			}
			iter1.Next()
			iter2.Next()
		}
	}

	if diffCount >= maxDiffsToShow {
		fmt.Printf("   ... (showing first %d differences only)\n", maxDiffsToShow)
	} else if diffCount == 0 {
		fmt.Printf("   🤔 All key-value pairs match, but root hashes differ\n")
	}
}
