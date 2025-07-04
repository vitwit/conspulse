package main

import (
	"archive/zip"
	"bytes"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"math/rand"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
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

// Request/Response structures for API
type CompareRequest struct {
	Source1 DataSourceRequest `json:"source1"`
	Source2 DataSourceRequest `json:"source2"`
	Options CompareOptions    `json:"options,omitempty"`
}

type DataSourceRequest struct {
	Type string `json:"type"` // "local", "zip_file", "zip_url", "upload"
	Path string `json:"path,omitempty"`
	URL  string `json:"url,omitempty"`
	Data []byte `json:"data,omitempty"` // For file uploads
	Name string `json:"name,omitempty"` // Original filename for uploads
}

type CompareOptions struct {
	MaxDiffsPerStore   int  `json:"max_diffs_per_store,omitempty"`
	ShowMatchingStores bool `json:"show_matching_stores,omitempty"`
	DetailedOutput     bool `json:"detailed_output,omitempty"`
}

type CompareResponse struct {
	Success  bool              `json:"success"`
	Error    string            `json:"error,omitempty"`
	Summary  ComparisonSummary `json:"summary"`
	Results  []StoreComparison `json:"results"`
	Metadata ResponseMetadata  `json:"metadata"`
}

type ComparisonSummary struct {
	TotalStores     int  `json:"total_stores"`
	MatchingStores  int  `json:"matching_stores"`
	DifferingStores int  `json:"differing_stores"`
	MissingStores   int  `json:"missing_stores"`
	IsIdentical     bool `json:"is_identical"`
}

type StoreComparison struct {
	Name        string            `json:"name"`
	Status      string            `json:"status"` // "match", "differ", "missing_source1", "missing_source2"
	Hash1       string            `json:"hash1,omitempty"`
	Hash2       string            `json:"hash2,omitempty"`
	StoreType1  string            `json:"store_type1,omitempty"`
	StoreType2  string            `json:"store_type2,omitempty"`
	Differences []StoreDifference `json:"differences,omitempty"`
	SampleData  *StoreSampleData  `json:"sample_data,omitempty"`
	Extra       string            `json:"extra,omitempty"`
}

type StoreDifference struct {
	Type        string `json:"type"` // "key_only_source1", "key_only_source2", "value_differ"
	Key         string `json:"key"`
	KeyHex      string `json:"key_hex"`
	Value1      string `json:"value1,omitempty"`
	Value1Hex   string `json:"value1_hex,omitempty"`
	Value2      string `json:"value2,omitempty"`
	Value2Hex   string `json:"value2_hex,omitempty"`
	Description string `json:"description"`
}

type StoreSampleData struct {
	Source     string      `json:"source"` // "source1" or "source2"
	KeyCount   int         `json:"key_count"`
	SampleKeys []SampleKey `json:"sample_keys"`
}

type SampleKey struct {
	Key    string `json:"key"`
	KeyHex string `json:"key_hex"`
}

type ResponseMetadata struct {
	Source1Version int64  `json:"source1_version"`
	Source2Version int64  `json:"source2_version"`
	ComparisonTime string `json:"comparison_time"`
	ProcessingTime string `json:"processing_time"`
}

type DataSource struct {
	Path   string
	IsTemp bool
}

func main() {
	if len(os.Args) < 2 {
		fmt.Println("Usage:")
		fmt.Println("  CLI mode: compare_stores <source1> <source2> [--json]")
		fmt.Println("  Web API mode: compare_stores --server [--port=8080]")
		fmt.Println()
		fmt.Println("Sources can be:")
		fmt.Println("  - Local directory path")
		fmt.Println("  - ZIP file path")
		fmt.Println("  - HTTP/HTTPS URL to ZIP file")
		os.Exit(1)
	}

	if os.Args[1] == "--server" {
		startWebServer()
		return
	}

	// CLI mode
	if len(os.Args) < 3 {
		fmt.Println("CLI mode requires two sources")
		os.Exit(1)
	}

	jsonOutput := len(os.Args) > 3 && os.Args[3] == "--json"
	runCLIComparison(os.Args[1], os.Args[2], jsonOutput)
}

func startWebServer() {
	port := "8080"
	for _, arg := range os.Args {
		if strings.HasPrefix(arg, "--port=") {
			port = strings.TrimPrefix(arg, "--port=")
		}
	}

	http.HandleFunc("/compare", handleCompareAPI)
	http.HandleFunc("/health", handleHealth)

	fmt.Printf("Starting store comparison API server on port %s\n", port)
	fmt.Printf("Endpoints:\n")
	fmt.Printf("  POST /compare - Compare two data sources\n")
	fmt.Printf("  GET  /health  - Health check\n")

	if err := http.ListenAndServe(":"+port, nil); err != nil {
		fmt.Printf("Server failed to start: %v\n", err)
		os.Exit(1)
	}
}

// Add CORS helper
func setCORSHeaders(w http.ResponseWriter) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
}

func handleHealth(w http.ResponseWriter, r *http.Request) {
	setCORSHeaders(w)
	if r.Method == http.MethodOptions {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		return
	}
	fmt.Printf("[Health] %s %s from %s\n", r.Method, r.URL.Path, r.RemoteAddr)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"status":  "healthy",
		"service": "debug-consensus-api",
		"version": "1.0.0",
	})
}

func handleCompareAPI(w http.ResponseWriter, r *http.Request) {
	setCORSHeaders(w)
	if r.Method == http.MethodOptions {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		return
	}
	fmt.Printf("[Compare] %s %s from %s\n", r.Method, r.URL.Path, r.RemoteAddr)
	w.Header().Set("Content-Type", "application/json")

	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		json.NewEncoder(w).Encode(CompareResponse{
			Success: false,
			Error:   "Method not allowed. Use POST.",
		})
		return
	}

	// Log request body for POST
	var bodyCopy bytes.Buffer
	tee := io.TeeReader(r.Body, &bodyCopy)
	var req CompareRequest
	if err := json.NewDecoder(tee).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(CompareResponse{
			Success: false,
			Error:   fmt.Sprintf("Invalid request body: %v", err),
		})
		return
	}
	fmt.Printf("[Compare] Request body: %s\n", bodyCopy.String())

	// Set default options
	if req.Options.MaxDiffsPerStore == 0 {
		req.Options.MaxDiffsPerStore = 5
	}

	response := performComparison(req)

	if !response.Success {
		w.WriteHeader(http.StatusInternalServerError)
	}

	json.NewEncoder(w).Encode(response)
}

func runCLIComparison(source1, source2 string, jsonOutput bool) {
	req := CompareRequest{
		Source1: DataSourceRequest{
			Type: detectSourceType(source1),
			Path: source1,
			URL:  source1,
		},
		Source2: DataSourceRequest{
			Type: detectSourceType(source2),
			Path: source2,
			URL:  source2,
		},
		Options: CompareOptions{
			MaxDiffsPerStore:   5,
			ShowMatchingStores: true,
			DetailedOutput:     true,
		},
	}

	response := performComparison(req)

	if jsonOutput {
		output, _ := json.MarshalIndent(response, "", "  ")
		fmt.Println(string(output))
	} else {
		// Open the DBs and multistores for tree shape diff
		db1, err1 := dbm.NewDB("application", dbm.GoLevelDBBackend, source1)
		db2, err2 := dbm.NewDB("application", dbm.GoLevelDBBackend, source2)
		var ms1, ms2 *rootmulti.Store
		if err1 == nil && err2 == nil {
			ms1 = store.NewCommitMultiStore(db1, log.NewNopLogger(), metrics.NewNoOpMetrics()).(*rootmulti.Store)
			ms2 = store.NewCommitMultiStore(db2, log.NewNopLogger(), metrics.NewNoOpMetrics()).(*rootmulti.Store)
			ver1 := ms1.LatestVersion()
			ver2 := ms2.LatestVersion()
			ms1.LoadVersion(ver1)
			ms2.LoadVersion(ver2)
		}
		printCLIOutput(response, ms1, ms2)
		if db1 != nil {
			db1.Close()
		}
		if db2 != nil {
			db2.Close()
		}
	}

	if !response.Success {
		os.Exit(1)
	}
}

func detectSourceType(source string) string {
	if strings.HasPrefix(source, "http://") || strings.HasPrefix(source, "https://") {
		return "zip_url"
	}
	if strings.HasSuffix(strings.ToLower(source), ".zip") {
		return "zip_file"
	}
	return "local"
}

// Generate a unique taskID for each comparison
func generateTaskID() string {
	rand.Seed(time.Now().UnixNano())
	return fmt.Sprintf("%d-%d", time.Now().UnixNano(), rand.Intn(100000))
}

// Helper to copy a directory recursively
func copyDir(src string, dst string) error {
	return filepath.Walk(src, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		relPath, err := filepath.Rel(src, path)
		if err != nil {
			return err
		}
		targetPath := filepath.Join(dst, relPath)
		if info.IsDir() {
			return os.MkdirAll(targetPath, info.Mode())
		}
		in, err := os.Open(path)
		if err != nil {
			return err
		}
		defer in.Close()
		out, err := os.Create(targetPath)
		if err != nil {
			return err
		}
		defer out.Close()
		_, err = io.Copy(out, in)
		if err != nil {
			return err
		}
		return os.Chmod(targetPath, info.Mode())
	})
}

// Helper to extract a zip file to a directory
func extractZipFromFile(zipPath, destDir string) error {
	zipData, err := os.ReadFile(zipPath)
	if err != nil {
		return fmt.Errorf("failed to read ZIP file: %v", err)
	}
	return extractZipFromBytes(zipData, destDir)
}

// Helper to download and extract a zip from URL to a directory
func downloadAndExtractZipToDir(url, destDir string) error {
	client := &http.Client{Timeout: 30 * time.Minute}
	resp, err := client.Get(url)
	if err != nil {
		return fmt.Errorf("failed to download ZIP: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("failed to download ZIP: HTTP %d", resp.StatusCode)
	}
	zipData, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("failed to read ZIP data: %v", err)
	}
	return extractZipFromBytes(zipData, destDir)
}

// Add a helper to find the real DB directory if there's a single subdirectory
func findDBDir(root string) string {
	files, err := os.ReadDir(root)
	if err != nil {
		return root
	}
	// If only one subdir, and it's a directory, descend into it
	if len(files) == 1 && files[0].IsDir() {
		return filepath.Join(root, files[0].Name())
	}
	// If multiple subdirs, pick the one containing application.db
	for _, f := range files {
		if f.IsDir() {
			subdir := filepath.Join(root, f.Name())
			appdb := filepath.Join(subdir, "application.db")
			info, err := os.Stat(appdb)
			if err == nil && info.IsDir() {
				return subdir
			}
		}
	}
	return root
}

// Refactor prepareDataSourceFromRequest to use taskID and dirName
func prepareDataSourceFromRequest(req DataSourceRequest, taskID, dirName string) (*DataSource, error) {
	targetDir := filepath.Join("inputs", taskID, dirName)
	os.MkdirAll(targetDir, 0755)

	switch req.Type {
	case "local":
		err := copyDir(req.Path, targetDir)
		if err != nil {
			return nil, fmt.Errorf("failed to copy local dir: %v", err)
		}
		finalDir := findDBDir(targetDir)
		fmt.Printf("[INFO] Final data directory used for comparison: %s\n", finalDir)
		return &DataSource{Path: finalDir, IsTemp: false}, nil

	case "zip_file":
		err := extractZipFromFile(req.Path, targetDir)
		if err != nil {
			return nil, fmt.Errorf("failed to extract zip file: %v", err)
		}
		finalDir := findDBDir(targetDir)
		fmt.Printf("[INFO] Final data directory used for comparison: %s\n", finalDir)
		return &DataSource{Path: finalDir, IsTemp: false}, nil

	case "zip_url":
		err := downloadAndExtractZipToDir(req.URL, targetDir)
		if err != nil {
			return nil, fmt.Errorf("failed to download/extract zip: %v", err)
		}
		finalDir := findDBDir(targetDir)
		fmt.Printf("[INFO] Final data directory used for comparison: %s\n", finalDir)
		return &DataSource{Path: finalDir, IsTemp: false}, nil

	case "upload":
		err := extractZipFromBytes(req.Data, targetDir)
		if err != nil {
			return nil, fmt.Errorf("failed to extract uploaded zip: %v", err)
		}
		finalDir := findDBDir(targetDir)
		fmt.Printf("[INFO] Final data directory used for comparison: %s\n", finalDir)
		return &DataSource{Path: finalDir, IsTemp: false}, nil

	default:
		return nil, fmt.Errorf("unsupported source type: %s", req.Type)
	}
}

// Add a helper to recursively log directory contents
func logDirContents(root string) {
	fmt.Printf("[DEBUG] Listing contents of %s\n", root)
	filepath.Walk(root, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			fmt.Printf("  [ERROR] %s: %v\n", path, err)
			return nil
		}
		rel, _ := filepath.Rel(root, path)
		if rel == "." {
			fmt.Printf("  [DIR]  %s\n", path)
		} else if info.IsDir() {
			fmt.Printf("  [DIR]  %s\n", rel)
		} else {
			fmt.Printf("  [FILE] %s\n", rel)
		}
		return nil
	})
}

func extractUploadedZip(data []byte, filename string) (*DataSource, error) {
	tempDir, err := os.MkdirTemp("", "store-compare-upload-*")
	if err != nil {
		return nil, fmt.Errorf("failed to create temp directory: %v", err)
	}

	extractDir := filepath.Join(tempDir, "extracted")
	err = extractZipFromBytes(data, extractDir)
	if err != nil {
		os.RemoveAll(tempDir)
		return nil, fmt.Errorf("failed to extract uploaded ZIP: %v", err)
	}

	logDirContents(extractDir)
	fmt.Printf("[INFO] Using extracted data directory for comparison: %s\n", extractDir)

	return &DataSource{Path: extractDir, IsTemp: true}, nil
}

func downloadAndExtractZip(url string) (*DataSource, error) {
	tempDir, err := os.MkdirTemp("", "store-compare-*")
	if err != nil {
		return nil, fmt.Errorf("failed to create temp directory: %v", err)
	}

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

	zipData, err := io.ReadAll(resp.Body)
	if err != nil {
		os.RemoveAll(tempDir)
		return nil, fmt.Errorf("failed to read ZIP data: %v", err)
	}

	extractDir := filepath.Join(tempDir, "extracted")
	err = extractZipFromBytes(zipData, extractDir)
	if err != nil {
		os.RemoveAll(tempDir)
		return nil, fmt.Errorf("failed to extract ZIP: %v", err)
	}

	logDirContents(extractDir)
	fmt.Printf("[INFO] Using extracted data directory for comparison: %s\n", extractDir)

	return &DataSource{Path: extractDir, IsTemp: true}, nil
}

func extractLocalZip(zipPath string) (*DataSource, error) {
	tempDir, err := os.MkdirTemp("", "store-compare-*")
	if err != nil {
		return nil, fmt.Errorf("failed to create temp directory: %v", err)
	}

	zipData, err := os.ReadFile(zipPath)
	if err != nil {
		os.RemoveAll(tempDir)
		return nil, fmt.Errorf("failed to read ZIP file: %v", err)
	}

	extractDir := filepath.Join(tempDir, "extracted")
	err = extractZipFromBytes(zipData, extractDir)
	if err != nil {
		os.RemoveAll(tempDir)
		return nil, fmt.Errorf("failed to extract ZIP: %v", err)
	}

	logDirContents(extractDir)
	fmt.Printf("[INFO] Using extracted data directory for comparison: %s\n", extractDir)

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

		if !strings.HasPrefix(path, filepath.Clean(destDir)+string(os.PathSeparator)) {
			return fmt.Errorf("invalid file path in ZIP: %s", file.Name)
		}

		if file.FileInfo().IsDir() {
			os.MkdirAll(path, file.FileInfo().Mode())
			continue
		}

		if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
			return err
		}

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
		// os.RemoveAll(source.Path) // Disabled for manual review
	}
}

type ComparisonResult struct {
	Summary  ComparisonSummary
	Results  []StoreComparison
	Metadata ResponseMetadata
}

func compareStoresForAPI(dataDir1, dataDir2 string, options CompareOptions) (*ComparisonResult, error) {
	// Open databases
	db1, err := dbm.NewDB("application", dbm.GoLevelDBBackend, dataDir1)
	if err != nil {
		return nil, fmt.Errorf("error opening database in %s: %v", dataDir1, err)
	}
	defer db1.Close()

	db2, err := dbm.NewDB("application", dbm.GoLevelDBBackend, dataDir2)
	if err != nil {
		return nil, fmt.Errorf("error opening database in %s: %v", dataDir2, err)
	}
	defer db2.Close()

	// Load multistores
	ms1 := store.NewCommitMultiStore(db1, log.NewNopLogger(), metrics.NewNoOpMetrics()).(*rootmulti.Store)
	ms2 := store.NewCommitMultiStore(db2, log.NewNopLogger(), metrics.NewNoOpMetrics()).(*rootmulti.Store)

	ver1 := ms1.LatestVersion()
	ver2 := ms2.LatestVersion()

	// Get commit info
	commitInfo1, err := ms1.GetCommitInfo(ver1)
	if err != nil {
		return nil, fmt.Errorf("error getting commit info for source1: %v", err)
	}
	commitInfo2, err := ms2.GetCommitInfo(ver2)
	if err != nil {
		return nil, fmt.Errorf("error getting commit info for source2: %v", err)
	}

	// Collect store hashes
	stores1 := map[string][]byte{}
	stores2 := map[string][]byte{}
	for _, s := range commitInfo1.StoreInfos {
		stores1[s.Name] = s.GetHash()
	}
	for _, s := range commitInfo2.StoreInfos {
		stores2[s.Name] = s.GetHash()
	}

	// Mount all stores
	allStoreNames := make(map[string]bool)
	for k := range stores1 {
		allStoreNames[k] = true
	}
	for k := range stores2 {
		allStoreNames[k] = true
	}

	for storeName := range allStoreNames {
		storeType := storetypes.StoreTypeIAVL
		ms1.MountStoreWithDB(storetypes.NewKVStoreKey(storeName), storeType, nil)
		ms2.MountStoreWithDB(storetypes.NewKVStoreKey(storeName), storeType, nil)
	}

	// Load versions
	ms1.LoadVersion(ver1)
	ms2.LoadVersion(ver2)

	// Prepare results
	var names []string
	for k := range allStoreNames {
		names = append(names, k)
	}
	sort.Strings(names)

	var results []StoreComparison
	summary := ComparisonSummary{}

	for _, name := range names {
		h1, ok1 := stores1[name]
		h2, ok2 := stores2[name]

		comparison := StoreComparison{Name: name}

		switch {
		case !ok1:
			comparison.Status = "missing_source1"
			comparison.Hash2 = fmt.Sprintf("%x", h2)
			if options.DetailedOutput {
				comparison.SampleData = getSampleData(ms2, name, "source2")
			}
			summary.MissingStores++

		case !ok2:
			comparison.Status = "missing_source2"
			comparison.Hash1 = fmt.Sprintf("%x", h1)
			if options.DetailedOutput {
				comparison.SampleData = getSampleData(ms1, name, "source1")
			}
			summary.MissingStores++

		case bytes.Equal(h1, h2):
			comparison.Status = "match"
			comparison.Hash1 = fmt.Sprintf("%x", h1)
			comparison.Hash2 = fmt.Sprintf("%x", h2)
			summary.MatchingStores++

		default:
			comparison.Status = "differ"
			comparison.Hash1 = fmt.Sprintf("%x", h1)
			comparison.Hash2 = fmt.Sprintf("%x", h2)
			if options.DetailedOutput {
				comparison.Differences = getStoreDifferences(ms1, ms2, name, options.MaxDiffsPerStore)
				comparison.StoreType1 = getStoreType(ms1, name)
				comparison.StoreType2 = getStoreType(ms2, name)
			}
			summary.DifferingStores++

			// Add latest version or error in Extra, with a helpful note
			var extraInfo []string
			ver1 := ms1.LatestVersion()
			ver2 := ms2.LatestVersion()
			extraInfo = append(extraInfo, fmt.Sprintf("source1 latest version: %d", ver1))
			extraInfo = append(extraInfo, fmt.Sprintf("source2 latest version: %d", ver2))
			missing1 := false
			missing2 := false
			if store1 := ms1.GetStoreByName(name); store1 != nil {
				if v, ok := store1.(interface{ LatestVersion() int64 }); ok {
					extraInfo = append(extraInfo, fmt.Sprintf("source1 store latest version: %d", v.LatestVersion()))
				}
			} else {
				extraInfo = append(extraInfo, "source1 store not found")
				missing1 = true
			}
			if store2 := ms2.GetStoreByName(name); store2 != nil {
				if v, ok := store2.(interface{ LatestVersion() int64 }); ok {
					extraInfo = append(extraInfo, fmt.Sprintf("source2 store latest version: %d", v.LatestVersion()))
				}
			} else {
				extraInfo = append(extraInfo, "source2 store not found")
				missing2 = true
			}
			// Add a note if either store is missing
			if missing1 && missing2 {
				extraInfo = append(extraInfo, fmt.Sprintf("note: Store '%s' is missing in both sources at the latest version. This may indicate the store was deleted, renamed, or never created in these snapshots. This could happen due to a misconfigured genesis file or an upgrade/migration that was not applied consistently to both sources.", name))
			} else if missing1 {
				extraInfo = append(extraInfo, fmt.Sprintf("note: Store '%s' is missing in source1 but present in source2. This may indicate a migration, deletion, or a difference in app versions.", name))
			} else if missing2 {
				extraInfo = append(extraInfo, fmt.Sprintf("note: Store '%s' is missing in source2 but present in source1. This may indicate a migration, deletion, or a difference in app versions.", name))
			}
			comparison.Extra = strings.Join(extraInfo, "; ")
		}

		if options.ShowMatchingStores || comparison.Status != "match" {
			results = append(results, comparison)
		}
		summary.TotalStores++

		if comparison.StoreType1 != "" && strings.Contains(strings.ToLower(comparison.StoreType1), "iavl") && comparison.Status == "differ" {
			store1 := ms1.GetStoreByName(name)
			store2 := ms2.GetStoreByName(name)
			var tree1, tree2 *iavl.ImmutableTree
			if t1, ok := store1.(interface{ GetImmutableTree() *iavl.ImmutableTree }); ok {
				tree1 = t1.GetImmutableTree()
			}
			if t2, ok := store2.(interface{ GetImmutableTree() *iavl.ImmutableTree }); ok {
				tree2 = t2.GetImmutableTree()
			}
			if tree1 != nil && tree2 != nil {
				shape1 := getIAVLTreeShape(tree1)
				shape2 := getIAVLTreeShape(tree2)
				diffs := diffLines(shape1, shape2)
				var sb strings.Builder
				sb.WriteString("Tree Shape Diff (IAVL):\n")
				for _, diff := range diffs {
					sb.WriteString("  " + decodeHexInLine(diff) + "\n")
				}
				comparison.Extra = sb.String()
			}
		}
	}

	summary.IsIdentical = summary.MissingStores == 0 && summary.DifferingStores == 0

	return &ComparisonResult{
		Summary: summary,
		Results: results,
		Metadata: ResponseMetadata{
			Source1Version: ver1,
			Source2Version: ver2,
		},
	}, nil
}

func getSampleData(ms *rootmulti.Store, storeName, source string) *StoreSampleData {
	store := ms.GetStoreByName(storeName)
	if store == nil {
		return nil
	}

	sampleData := &StoreSampleData{
		Source:     source,
		SampleKeys: []SampleKey{},
	}

	if kvStore, ok := store.(storetypes.KVStore); ok {
		iter := kvStore.Iterator(nil, nil)
		if iter != nil {
			defer iter.Close()
			count := 0
			for ; iter.Valid() && count < 3; iter.Next() {
				key := iter.Key()
				sampleData.SampleKeys = append(sampleData.SampleKeys, SampleKey{
					Key:    string(key),
					KeyHex: fmt.Sprintf("%x", key),
				})
				count++
			}
		}
	}

	return sampleData
}

func getStoreType(ms *rootmulti.Store, storeName string) string {
	store := ms.GetStoreByName(storeName)
	if store == nil {
		return "nil"
	}
	return fmt.Sprintf("%T", store)
}

func getStoreDifferences(ms1, ms2 *rootmulti.Store, storeName string, maxDiffs int) []StoreDifference {
	var differences []StoreDifference

	s1 := ms1.GetStoreByName(storeName)
	s2 := ms2.GetStoreByName(storeName)

	if s1 == nil || s2 == nil {
		return differences
	}

	// Try IAVL comparison
	if t1, ok1 := s1.(interface{ GetImmutableTree() *iavl.ImmutableTree }); ok1 {
		if t2, ok2 := s2.(interface{ GetImmutableTree() *iavl.ImmutableTree }); ok2 {
			tree1 := t1.GetImmutableTree()
			tree2 := t2.GetImmutableTree()
			if tree1 != nil && tree2 != nil {
				return compareIAVLTreesForAPI(tree1, tree2, maxDiffs)
			}
		}
	}

	// Fallback to KVStore comparison
	if kv1, ok := s1.(storetypes.KVStore); ok {
		if kv2, ok := s2.(storetypes.KVStore); ok {
			return compareKVStoresForAPI(kv1, kv2, maxDiffs)
		}
	}

	return differences
}

func compareIAVLTreesForAPI(tree1, tree2 *iavl.ImmutableTree, maxDiffs int) []StoreDifference {
	var differences []StoreDifference

	itr1, err := tree1.Iterator(nil, nil, true)
	if err != nil {
		return differences
	}
	defer itr1.Close()

	itr2, err := tree2.Iterator(nil, nil, true)
	if err != nil {
		return differences
	}
	defer itr2.Close()

	diffCount := 0
	for (itr1.Valid() || itr2.Valid()) && diffCount < maxDiffs {
		if !itr1.Valid() {
			k2, v2 := itr2.Key(), itr2.Value()
			differences = append(differences, StoreDifference{
				Type:        "key_only_source2",
				Key:         string(k2),
				KeyHex:      fmt.Sprintf("%x", k2),
				Value2:      string(v2),
				Value2Hex:   fmt.Sprintf("%x", v2),
				Description: "Key exists only in source2",
			})
			diffCount++
			itr2.Next()
			continue
		}

		if !itr2.Valid() {
			k1, v1 := itr1.Key(), itr1.Value()
			differences = append(differences, StoreDifference{
				Type:        "key_only_source1",
				Key:         string(k1),
				KeyHex:      fmt.Sprintf("%x", k1),
				Value1:      string(v1),
				Value1Hex:   fmt.Sprintf("%x", v1),
				Description: "Key exists only in source1",
			})
			diffCount++
			itr1.Next()
			continue
		}

		k1, v1 := itr1.Key(), itr1.Value()
		k2, v2 := itr2.Key(), itr2.Value()

		keyCompare := bytes.Compare(k1, k2)
		if keyCompare < 0 {
			differences = append(differences, StoreDifference{
				Type:        "key_only_source1",
				Key:         string(k1),
				KeyHex:      fmt.Sprintf("%x", k1),
				Value1:      string(v1),
				Value1Hex:   fmt.Sprintf("%x", v1),
				Description: "Key exists only in source1",
			})
			diffCount++
			itr1.Next()
		} else if keyCompare > 0 {
			differences = append(differences, StoreDifference{
				Type:        "key_only_source2",
				Key:         string(k2),
				KeyHex:      fmt.Sprintf("%x", k2),
				Value2:      string(v2),
				Value2Hex:   fmt.Sprintf("%x", v2),
				Description: "Key exists only in source2",
			})
			diffCount++
			itr2.Next()
		} else {
			if !bytes.Equal(v1, v2) {
				differences = append(differences, StoreDifference{
					Type:        "value_differ",
					Key:         string(k1),
					KeyHex:      fmt.Sprintf("%x", k1),
					Value1:      string(v1),
					Value1Hex:   fmt.Sprintf("%x", v1),
					Value2:      string(v2),
					Value2Hex:   fmt.Sprintf("%x", v2),
					Description: "Values differ for the same key",
				})
				diffCount++
			}
			itr1.Next()
			itr2.Next()
		}
	}

	return differences
}

func compareKVStoresForAPI(kv1, kv2 storetypes.KVStore, maxDiffs int) []StoreDifference {
	var differences []StoreDifference

	iter1 := kv1.Iterator(nil, nil)
	if iter1 == nil {
		return differences
	}
	defer iter1.Close()

	iter2 := kv2.Iterator(nil, nil)
	if iter2 == nil {
		return differences
	}
	defer iter2.Close()

	diffCount := 0
	for (iter1.Valid() || iter2.Valid()) && diffCount < maxDiffs {
		if !iter1.Valid() {
			k2, v2 := iter2.Key(), iter2.Value()
			differences = append(differences, StoreDifference{
				Type:        "key_only_source2",
				Key:         string(k2),
				KeyHex:      fmt.Sprintf("%x", k2),
				Value2:      string(v2),
				Value2Hex:   fmt.Sprintf("%x", v2),
				Description: "Key exists only in source2",
			})
			diffCount++
			iter2.Next()
			continue
		}

		if !iter2.Valid() {
			k1, v1 := iter1.Key(), iter1.Value()
			differences = append(differences, StoreDifference{
				Type:        "key_only_source1",
				Key:         string(k1),
				KeyHex:      fmt.Sprintf("%x", k1),
				Value1:      string(v1),
				Value1Hex:   fmt.Sprintf("%x", v1),
				Description: "Key exists only in source1",
			})
			diffCount++
			iter1.Next()
			continue
		}

		k1, v1 := iter1.Key(), iter1.Value()
		k2, v2 := iter2.Key(), iter2.Value()

		keyCompare := bytes.Compare(k1, k2)
		if keyCompare < 0 {
			differences = append(differences, StoreDifference{
				Type:        "key_only_source1",
				Key:         string(k1),
				KeyHex:      fmt.Sprintf("%x", k1),
				Value1:      string(v1),
				Value1Hex:   fmt.Sprintf("%x", v1),
				Description: "Key exists only in source1",
			})
			diffCount++
			iter1.Next()
		} else if keyCompare > 0 {
			differences = append(differences, StoreDifference{
				Type:        "key_only_source2",
				Key:         string(k2),
				KeyHex:      fmt.Sprintf("%x", k2),
				Value2:      string(v2),
				Value2Hex:   fmt.Sprintf("%x", v2),
				Description: "Key exists only in source2",
			})
			diffCount++
			iter2.Next()
		} else {
			if !bytes.Equal(v1, v2) {
				differences = append(differences, StoreDifference{
					Type:        "value_differ",
					Key:         string(k1),
					KeyHex:      fmt.Sprintf("%x", k1),
					Value1:      string(v1),
					Value1Hex:   fmt.Sprintf("%x", v1),
					Value2:      string(v2),
					Value2Hex:   fmt.Sprintf("%x", v2),
					Description: "Values differ for the same key",
				})
				diffCount++
			}
			iter1.Next()
			iter2.Next()
		}
	}

	return differences
}

func printCLIOutput(response CompareResponse, ms1, ms2 *rootmulti.Store) {
	if !response.Success {
		fmt.Printf("❌ Comparison failed: %s\n", response.Error)
		return
	}

	fmt.Printf("\n===== Store Comparison Result =====\n")
	fmt.Printf("Source1 LatestVersion: %d\n", response.Metadata.Source1Version)
	fmt.Printf("Source2 LatestVersion: %d\n", response.Metadata.Source2Version)
	fmt.Printf("Comparison Time: %s\n", response.Metadata.ComparisonTime)
	fmt.Printf("Processing Time: %s\n", response.Metadata.ProcessingTime)
	fmt.Printf("\n--- Summary ---\n")
	fmt.Printf("Total Stores:      %d\n", response.Summary.TotalStores)
	fmt.Printf("Matching Stores:   %d\n", response.Summary.MatchingStores)
	fmt.Printf("Differing Stores:  %d\n", response.Summary.DifferingStores)
	fmt.Printf("Missing Stores:    %d\n", response.Summary.MissingStores)
	fmt.Printf("Is Identical:      %v\n", response.Summary.IsIdentical)

	fmt.Printf("\n--- Store Results ---\n")
	for _, res := range response.Results {
		statusIcon := map[string]string{
			"match":           "✅",
			"differ":          "❌",
			"missing_source1": "⬅️  (missing in source1)",
			"missing_source2": "➡️  (missing in source2)",
		}[res.Status]
		if statusIcon == "" {
			statusIcon = res.Status
		}
		fmt.Printf("\n%s Store: %s\n", statusIcon, res.Name)
		if res.Hash1 != "" {
			fmt.Printf("  Hash1: %s\n", res.Hash1)
		}
		if res.Hash2 != "" {
			fmt.Printf("  Hash2: %s\n", res.Hash2)
		}
		if res.StoreType1 != "" {
			fmt.Printf("  StoreType1: %s\n", res.StoreType1)
		}
		if res.StoreType2 != "" {
			fmt.Printf("  StoreType2: %s\n", res.StoreType2)
		}
		if res.SampleData != nil {
			fmt.Printf("  SampleData (%s):\n", res.SampleData.Source)
			fmt.Printf("    KeyCount: %d\n", res.SampleData.KeyCount)
			if len(res.SampleData.SampleKeys) > 0 {
				fmt.Printf("    Sample Keys:\n")
				for _, sk := range res.SampleData.SampleKeys {
					fmt.Printf("      - Key: '%s' (hex: %s)\n", sk.Key, sk.KeyHex)
				}
			}
		}
		if len(res.Differences) > 0 {
			fmt.Printf("  Differences (showing up to %d):\n", len(res.Differences))
			for i, diff := range res.Differences {
				fmt.Printf("    %d. [%s] Key: '%s' (hex: %s)\n", i+1, diff.Type, diff.Key, diff.KeyHex)
				if diff.Value1 != "" {
					fmt.Printf("       Value1: '%s' (hex: %s)\n", diff.Value1, diff.Value1Hex)
				}
				if diff.Value2 != "" {
					fmt.Printf("       Value2: '%s' (hex: %s)\n", diff.Value2, diff.Value2Hex)
				}
				fmt.Printf("       Description: %s\n", diff.Description)
			}
			// Show tree shape diff for IAVL stores
			if res.StoreType1 != "" && strings.Contains(strings.ToLower(res.StoreType1), "iavl") && res.Status == "differ" {
				fmt.Printf("  Tree Shape Diff (IAVL):\n")
				store1 := ms1.GetStoreByName(res.Name)
				store2 := ms2.GetStoreByName(res.Name)
				var tree1, tree2 *iavl.ImmutableTree
				if t1, ok := store1.(interface{ GetImmutableTree() *iavl.ImmutableTree }); ok {
					tree1 = t1.GetImmutableTree()
				}
				if t2, ok := store2.(interface{ GetImmutableTree() *iavl.ImmutableTree }); ok {
					tree2 = t2.GetImmutableTree()
				}
				if tree1 != nil && tree2 != nil {
					shape1 := getIAVLTreeShape(tree1)
					shape2 := getIAVLTreeShape(tree2)
					diffs := diffLines(shape1, shape2)
					for _, diff := range diffs {
						fmt.Printf("    %s\n", decodeHexInLine(diff))
					}
				}
			}
		}
	}
	fmt.Printf("\n===================================\n\n")
}

// Refactor getIAVLTreeShape to use the iterator API
func getIAVLTreeShape(tree *iavl.ImmutableTree) []string {
	var lines []string
	itr, err := tree.Iterator(nil, nil, true)
	if err != nil {
		return lines
	}
	defer itr.Close()
	for ; itr.Valid(); itr.Next() {
		lines = append(lines, fmt.Sprintf("key=%x value=%x", itr.Key(), itr.Value()))
	}
	return lines
}

// Add a function to diff two string slices (line-by-line)
func diffLines(a, b []string) []string {
	var diffs []string
	alen, blen := len(a), len(b)
	max := alen
	if blen > max {
		max = blen
	}
	for i := 0; i < max; i++ {
		var left, right string
		if i < alen {
			left = a[i]
		}
		if i < blen {
			right = b[i]
		}
		if left != right {
			if left != "" {
				diffs = append(diffs, "- "+left)
			}
			if right != "" {
				diffs = append(diffs, "+ "+right)
			}
		}
	}
	return diffs
}

// Add a function to decode hex in a line to ASCII
func decodeHexInLine(line string) string {
	re := regexp.MustCompile(`([0-9a-fA-F]{4,})`)
	return re.ReplaceAllStringFunc(line, func(hexStr string) string {
		bytes, err := hexStringToBytes(hexStr)
		if err != nil {
			return hexStr
		}
		ascii := string(bytes)
		ascii = strings.ReplaceAll(ascii, "\x00", "") // Remove nulls
		if ascii == "" {
			return hexStr
		}
		return fmt.Sprintf("%s (ascii: '%s')", hexStr, ascii)
	})
}

func hexStringToBytes(s string) ([]byte, error) {
	if len(s)%2 != 0 {
		s = "0" + s
	}
	return hex.DecodeString(s)
}

func performComparison(req CompareRequest) CompareResponse {
	startTime := time.Now()

	response := CompareResponse{
		Success: true,
		Metadata: ResponseMetadata{
			ComparisonTime: time.Now().UTC().Format(time.RFC3339),
		},
	}

	// Generate a unique taskID for this comparison
	taskID := generateTaskID()
	inputDir := filepath.Join("inputs", taskID)

	// Prepare data sources
	source1, err := prepareDataSourceFromRequest(req.Source1, taskID, "dir1")
	if err != nil {
		response.Success = false
		response.Error = fmt.Sprintf("Error preparing source1: %v", err)
		os.RemoveAll(inputDir)
		return response
	}

	source2, err := prepareDataSourceFromRequest(req.Source2, taskID, "dir2")
	if err != nil {
		response.Success = false
		response.Error = fmt.Sprintf("Error preparing source2: %v", err)
		os.RemoveAll(inputDir)
		return response
	}

	// Perform comparison
	result, err := compareStoresForAPI(source1.Path, source2.Path, req.Options)
	if err != nil {
		response.Success = false
		response.Error = fmt.Sprintf("Comparison failed: %v", err)
		os.RemoveAll(inputDir)
		return response
	}

	response.Summary = result.Summary
	response.Results = result.Results
	response.Metadata.Source1Version = result.Metadata.Source1Version
	response.Metadata.Source2Version = result.Metadata.Source2Version
	response.Metadata.ProcessingTime = time.Since(startTime).String()

	// Clean up after processing
	os.RemoveAll(inputDir)

	return response
}
