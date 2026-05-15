export interface Stats {
    address: string;
    moniker: string;
    version: string;
    earliestAppHash: string;
    latestAppHash: string;
    isSyncing: boolean;
    earliestBlockHeight: number;
    latestBlockHeight: number;
    votingPower: number;
    height: number;
    blockTime: number;
    nodeID: string;
    peers: any[];
    network: string;
    os: string;
    goVersion: string;
    country: string;
    latitude: number;
    longitude: number;
    transactions: number;
    latency: number;
    updatedAt: number;
}

export interface NodesStatMessage {
    type: 'node_stats';
    stats: Stats[];
}

export interface BlockWindow {
    blockNumber: number;
    blockTime: number;
    txnCount: number;
}

export interface NetworkMessage {
    type: 'network_stats';
    averageBlockTime: string;
    blockPropagation: Record<string, number>;
    blocksWindow: BlockWindow[];
}

export type WebSocketMessage = NodesStatMessage | NetworkMessage;
