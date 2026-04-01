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
    goVersion             String,
    latitude              Float64,
    longitude             Float64,
    country               String,
    Transactions          UInt64,
    updatedAt             UInt64,
    latency               UInt64,
)
ENGINE = ReplacingMergeTree(updatedAt)
PARTITION BY toYYYYMM(blockTime)
ORDER BY (address, height);

CREATE TABLE IF NOT EXISTS blocks (
    height UInt64,
    time DateTime64(9, 'UTC'),
    chain_id String,
    proposer_address String,
    
    data_hash String,
    app_hash String,
    consensus_hash String,
    
    last_commit_hash String,
    last_results_hash String,
    
    validators_hash String,
    next_validators_hash String,

    transactions UInt64,
    txs_data Array(String),

    evidence_hash String,

    signatures String,
    
    result_finalize_block JSON
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(time)             
ORDER BY (time, height)                 
TTL time + INTERVAL 3 MONTH DELETE; 

CREATE TABLE IF NOT EXISTS side_txs
(
    insert_id UUID,
    height UInt64,
    time DateTime64(9, 'UTC'),
    sidetx_commits String,
    sidetx_summary String
)
ENGINE = ReplacingMergeTree()
PARTITION BY toYYYYMM(time)             
ORDER BY (height, insert_id)   
TTL time + INTERVAL 3 MONTH DELETE;

CREATE TABLE IF NOT EXISTS transactions (
    txhash String,
    height UInt64,
    time DateTime64(9, 'UTC'),
    sender String,
    data String,
    raw_log String DEFAULT '',
    raw_tx String,
    messages Array(JSON),
    events String DEFAULT '[]',
    gas_wanted UInt64,
    gas_used UInt64,
    fee String,
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(time)
ORDER BY (height, txhash)
TTL time + INTERVAL 3 MONTH DELETE;

