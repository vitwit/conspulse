CREATE TABLE IF NOT EXISTS nodes (
  id String,
  version String,
  network String,
  os String,
  goVersion String,
  address String,
  pubkeyType String,
  pubkey String,
  isValidator Boolean
) ENGINE = MergeTree()
ORDER BY address;

CREATE TABLE IF NOT EXISTS node_stats
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
    goVersion             String
)
ENGINE = ReplacingMergeTree
PARTITION BY toYYYYMM(blockTime)
ORDER BY (address, height)
