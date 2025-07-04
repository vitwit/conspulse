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

const API = process.env.NEXT_PUBLIC_METRICS_BACKEND_URL;

export async function getNodes(): Promise<NodeStats[]> {
    try {
        const response = await fetch(`${API}/api/stats`);

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
