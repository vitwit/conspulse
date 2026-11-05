-- Migration: Change node_stats ORDER BY from (address, height) to (moniker, height)
-- Reason: moniker is the unique identifier per node; address can be shared across multiple nodes (sentries)
--
-- Run these statements sequentially. Step 2 may take time depending on data volume.
-- The backend server can remain running during steps 1-2, but should be stopped before step 3.

-- Step 1: Create new table with correct ORDER BY
CREATE TABLE IF NOT EXISTS node_stats_new
(
    height                UInt64,
    blockTime             DateTime,
    nodeID                String,
    address               String,
    moniker               String,
    version               String,
    votingPower           UInt64,
    isSyncing             Boolean,
    earliestBlockHeight   UInt64,
    earliestAppHash       String,
    latestBlockHeight     String,
    latestAppHash         String,
    peers                 Array(String),
    network               String,
    os                    String,
    goVersion             String,
    latitude              Float64,
    longitude             Float64,
    country               String,
    Transactions          UInt64,
    updatedAt             UInt64,
    latency               UInt64
)
ENGINE = ReplacingMergeTree(updatedAt)
PARTITION BY toYYYYMM(blockTime)
ORDER BY (moniker, height);

-- Step 2: Copy existing data
INSERT INTO node_stats_new SELECT * FROM node_stats;

-- Step 3: Atomic rename (stop backend before running this)
RENAME TABLE node_stats TO node_stats_old, node_stats_new TO node_stats;

-- Step 4: Verify row counts match before dropping
-- SELECT count() FROM node_stats;
-- SELECT count() FROM node_stats_old;

-- Step 5: Drop old table after verifying
DROP TABLE IF EXISTS node_stats_old;
