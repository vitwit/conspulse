// nodeInfo is the collection of meta information about a node that is displayed
// on the monitoring page.
interface NodeInfo {
  name: string;
  node: string;
  port: number;
  net: string;
  protocol: string;
  api: string;
  os: string;
  os_v: string;
  client: string;
  canUpdateHistory: boolean;
}

// nodeStats is the information to report about the local node.
interface NodeStats {
  active: boolean;
  syncing: boolean;
  mining: boolean;
  hashrate: number;
  peers: number;
  gasPrice: number;
  uptime: number;
  hversion: string;
}

// blockStats is the information to report about individual blocks.
interface BlockStats {
  number: bigint;
  hash: string;
  timestamp: bigint;
  gasUsed: number;
  gasLimit: number;
  difficulty: string;
  totalDifficulty: string;
  transactions: TxStats[];
  transactionsRoot: string;
  uncles: string[];
  heimdallVersion: string;
  borVersion: string;
}

// txStats represents a transaction's minimal info.
interface TxStats {
  hash: string;
}

// authMsg is the authentication infos needed to login to a monitoring server.
interface AuthMsg {
  id: string;
  info: NodeInfo;
  secret: string;
}
