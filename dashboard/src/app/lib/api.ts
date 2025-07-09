export interface NodeStats {
    height: number;
    blockTime: string;
    address: string;
    nodeID: string;
    moniker: string;
    version: string;
    votingPower: number;
    isSyncing: boolean;
    earliestBlockHeight: number;
    earliestAppHash: string;
    latestBlockHeight: string;
    latestAppHash: string;
    peers: string[];
    network: string;
    os: string;
    goVersion: string;
    latitude: number;
    longitude: number;
    transactions: number;
    country: string;
    latency: number;
}

type BlockPropagation = {
    "0-2s": number;
    "2-3s": number;
    "3-4s": number;
    "4-5s": number;
    "5-6s": number;
    "6-7s": number;
    "7-8s": number;
    "8-9s": number;
    "9-10s": number;
    "10s+": number;
};

export type NetworkStats = {
    averageBlockTime: string;
    blockPropagation?: BlockPropagation;
};


const API = process.env.NEXT_PUBLIC_METRICS_BACKEND_URL;

export async function getNodes(): Promise<NodeStats[]> {
    try {
        const response = await fetch(`${API}/api/node-stats`);

        if (!response.ok) {
            throw new Error(`Failed to fetch node stats: ${response.status}`);
        }

        const data: any = await response.json();
        if (data.nodes) {
            return data.nodes as NodeStats[];
        } else {
            return [];
        }
    } catch (error) {
        console.error('Error fetching node stats:', error);
        throw error;
    }
}


export async function getStats(): Promise<NetworkStats> {
    try {
        const response = await fetch(`${API}/api/stats`);

        if (!response.ok) {
            throw new Error(`Failed to fetch node stats: ${response.status}`);
        }

        const data: any = await response.json();
        if (data) {
            return data as NetworkStats;
        } else {
            return {
                averageBlockTime: "0s",
                blockPropagation: undefined
            };
        }
    } catch (error) {
        console.error('Error fetching network stats:', error);
        throw error;
    }
}
