import { createClient } from '@clickhouse/client';
import * as fs from 'fs/promises';
import * as path from 'path';
import logger from './../logger/logger';
import { clients } from '../ws';
import { WebSocket } from 'ws';

type NodeStatsMap = Map<string, NodeStats>;

export interface NodeInfo {
    id: string;
    version: string;
    network: string;
    os: string;
    goVersion: string;
    address: string;
    pubkeyType: string;
    pubkey: string;
    isValidator: boolean;
}

export interface NodeStats {
    height: number;
    blockTime: number;
    nodeID: string;
    address: string;
    moniker: string;
    version: string;
    votingPower: number;
    isSyncing: boolean;
    earliestBlockHeight: number;
    earliestAppHash: string;
    latestBlockHeight: number;
    latestAppHash: string;
    peers: string[];
    network: string;
    os: string;
    goVersion: string;
    latitude: number;
    longitude: number;
    country: string;
    transactions: number;
    updatedAt: number;
    latency: number;
}

type CutoffResult = {
    address: string;
    minHeightToKeep: number;
};

type Block = {
    height: number;
    time: string;
    chain_id: string;
    proposer_address: string;

    data_hash: string;
    app_hash: string;
    consensus_hash: string;

    last_commit_hash: string;
    last_results_hash: string;

    validators_hash: string;
    next_validators_hash: string;

    transactions: number;

    evidence_hash: string;

    signatures: string;
    result_finalize_block: any;

    sidetx_commits?: any;
    sidetx_summary?: any;
};

type Transaction = {
    txhash: string;
    height: number;
    time: string; // ISO
    sender: string;
    data: string;
    raw_log: string;
    raw_tx: string;
    messages: any[];
    events: any[];
    gas_wanted: number;
    gas_used: number;
    fee: string;
}

export class Database {
    private client: ReturnType<typeof createClient>;
    private nodes: NodeInfo[];
    private latestStats: NodeStatsMap = new Map();

    private statsBuffer: NodeStats[] = [];
    private flushTimeout: NodeJS.Timeout | null = null;


    constructor(host: string, username: string, password: string, database?: string) {
        this.client = createClient({
            url: host,
            username: username,
            password: password,
            database: database,
        });
        this.nodes = [];

    }

    async initialize(): Promise<boolean> {
        try {
            await this.client.ping();
            logger.info("connected to ClickHouse database")
            return true;
        } catch (error) {
            logger.error(`Failed to connect: ${error}`);
            return false;
        }
    }

    async initializeSchema(schemaFilePath = './schema.sql'): Promise<void> {
        try {
            const fullPath = path.resolve(schemaFilePath);
            const sqlContent = await fs.readFile(fullPath, 'utf-8');

            // Split by semicolon and trim whitespace
            const statements = sqlContent
                .split(';')
                .map(stmt => stmt.trim())
                .filter(stmt => stmt.length > 0);

            for (const stmt of statements) {
                await this.client.command({ query: stmt });
            }

            logger.info(`Schema initialized from file: ${fullPath}`);
        } catch (err) {
            logger.error('Failed to initialize schema:', err);
            throw err;
        }
    }

    async registerNode(node: NodeInfo): Promise<void> {
        await this.client.insert({
            table: 'nodes',
            values: [node],
            format: 'JSONEachRow',
        });

        logger.debug(`Node registered: ${node.address}`);
        this.nodes.push(node);

    }

    async broadcastNodes(): Promise<void> {
        const message: any = {
            type: "nodes",
            nodes: this.nodes,
        }
        const bz = JSON.stringify(message)
        for (const client of clients) {
            if (client.readyState === WebSocket.OPEN) {
                client.send(bz);
            }
        }
    }

    async broadcastStats(): Promise<void> {
        const statsList = Array.from(this.latestStats.values())
            .sort((a, b) => b.blockTime - a.blockTime);
        const message = JSON.stringify({
            type: "node_stats",
            stats: statsList
        });

        for (const client of clients) {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        }
    }

    async storeNodeStats(stats: NodeStats): Promise<void> {
        const key = stats.nodeID || stats.address;
        this.latestStats.set(key, stats);

        this.statsBuffer.push(stats);

        if (!this.flushTimeout) {
            this.flushTimeout = setTimeout(async () => {
                const batch = [...this.statsBuffer];
                this.statsBuffer = [];
                this.flushTimeout = null;

                try {
                    if (batch.length > 0) {
                        await this.client.insert({
                            table: 'node_stats',
                            values: batch,
                            format: 'JSONEachRow',
                        });

                        await this.broadcastStats();
                    }
                } catch (err) {
                    console.error("Failed to batch-insert stats:", err);
                    // Optionally: re-queue batch
                }
            }, 1000);
        }
    }

    async updateNode(node: NodeInfo): Promise<void> {
        const query = `
      ALTER TABLE nodes
      UPDATE 
        id = {id:String},
        version = {version:String},
        network = {network:String},
        os = {os:String},
        goVersion = {goVersion:String},
        pubkeyType = {pubkeyType:String},
        pubkey = {pubkey:String},
        isValidator = {isValidator:Bool}
      WHERE address = {address:String}
    `;

        await this.client.query({
            query,
            query_params: {
                id: node.id,
                version: node.version,
                network: node.network,
                os: node.os,
                goVersion: node.goVersion,
                pubkeyType: node.pubkeyType,
                pubkey: node.pubkey,
                isValidator: node.isValidator,
                address: node.address,
            },
        });

        logger.debug(`Node updated: ${node.address}`);
    }

    async isNodeRegistered(address: string): Promise<boolean> {
        const query = `
        SELECT 1
        FROM nodes
        WHERE address = {address:String}
        LIMIT 1
    `;

        try {
            const result = await this.client.query({
                query,
                query_params: { address },
                format: 'JSON',
            });

            const rows: any = await result.json();
            return rows?.data?.length > 0;
        } catch (err) {
            logger.error(`Failed to check if node is registered: ${err}`);
            throw err;
        }
    }

    async getNodes(): Promise<NodeStats[]> {
        try {
            const query = `
WITH ranked AS (
    SELECT
        *,
        row_number() OVER (PARTITION BY address ORDER BY blockTime DESC) AS rn
    FROM node_stats
)

SELECT *
FROM ranked
WHERE rn = 1
ORDER BY blockTime DESC;

            `;

            const resultSet = await this.client.query({
                query,
                format: 'JSON'
            });

            const { data } = await resultSet.json();

            return data as NodeStats[];
        } catch (err) {
            logger.error(`failed to get nodes: ${err}`);
            throw err;
        }

    }

    async cleanOldRecords(): Promise<void> {
        // Fixed query using row_number() to find the 500th latest height per address
        const cutoffQuery = `
        SELECT
            address,
            min(height) AS minHeightToKeep
        FROM (
            SELECT
                address,
                height,
                row_number() OVER (PARTITION BY address ORDER BY height DESC) AS rn
            FROM node_stats
        )
        WHERE rn = 500
        GROUP BY address
    `;

        try {
            logger.info(`Pruning records job started`);

            // Step 1: Fetch cutoff heights per address
            const result: CutoffResult[] = await this.client
                .query({
                    query: cutoffQuery,
                    format: 'JSONEachRow',
                    clickhouse_settings: {
                        max_memory_usage: '6000000000', // limit to 6 GiB just to be safe
                    }
                })
                .then((res) => res.json());

            if (result.length === 0) {
                logger.info('No records need pruning. Exiting cleanup.');
                return;
            }

            const batchSize = 50;

            // Step 2: Delete records in batches
            for (let i = 0; i < result.length; i += batchSize) {
                const batch = result.slice(i, i + batchSize);
                logger.info(`Processing batch ${i / batchSize + 1} of ${Math.ceil(result.length / batchSize)}`);

                for (const { address, minHeightToKeep } of batch) {
                    const deleteQuery = `
                    ALTER TABLE node_stats
                    DELETE WHERE address = '${address}' AND height < ${minHeightToKeep}
                `;

                    try {
                        await this.client.command({ query: deleteQuery });
                        logger.info(`Deleted old records for address ${address} below height ${minHeightToKeep}`);
                    } catch (err) {
                        logger.error(`Delete failed for address ${address}:`, err);
                    }
                }
            }

            logger.info('Cleanup completed successfully.');
        } catch (error) {
            logger.error(`Error during cleanup: ${error}`);
        }
    }

    async insertBlock(block: Block): Promise<void> {
        try {
            await this.client.insert({
                table: 'blocks',
                values: [block],
                format: 'JSONEachRow',
            });

            logger.debug(`Block inserted: height=${block.height}, chain_id=${block.chain_id}`);
        } catch (err) {
            logger.error(`Failed to insert block: ${err}`);
            throw err;
        }
    }

    async updateSideTxInfo(height: number, commits: any, summary: any): Promise<void> {
        try {
            const query = `
      ALTER TABLE blocks
      UPDATE 
        sidetx_commits = {commits:String},
        sidetx_summary = {summary:String}
      WHERE height = {height:UInt64}
    `;

            await this.client.query({
                query,
                query_params: {
                    height,
                    commits: JSON.stringify(commits),
                    summary: JSON.stringify(summary),
                },
            });

            logger.debug(`Block updated with side txs info: ${height}`);
        } catch (err) {
            logger.error(`Failed updating side txs info in block ${height}: ${err}`);
            throw err;
        }
    }

    async getBlocksPaginated(
        page: number = 1,
        limit: number = 25
    ): Promise<Block[]> {
        const offset = (page - 1) * limit;
        const query = `
        SELECT 
            height, time, chain_id, proposer_address, data_hash, 
            app_hash, consensus_hash, last_commit_hash, last_results_hash, 
            validators_hash, next_validators_hash, transactions, 
            evidence_hash, signatures, 
            if(length(toString(sidetx_commits)) > 4, 'yes', '') as sidetx_commits,
            if(length(toString(sidetx_summary)) > 4, 'yes', '') as sidetx_summary
        FROM blocks
        WHERE height IN (
            SELECT height
            FROM blocks
            ORDER BY time DESC, height DESC
            LIMIT ${limit} OFFSET ${offset}
        )
        ORDER BY time DESC, height DESC
    `;

        try {
            const result = await this.client.query({
                query,
                format: 'JSONEachRow',
            });

            const data = await result.json();
            return data as Block[];
        } catch (err) {
            logger.error(`Failed to fetch paginated blocks: ${err}`);
            throw err;
        }
    }

    async getBlock(
        height: number
    ): Promise<Block> {
        const query = `
        SELECT *
        FROM blocks
        WHERE height = ${height}
        `;

        try {
            const result = await this.client.query({
                query,
                format: 'JSONEachRow',
            });

            const data = await result.json();
            if (data.length === 0) {
                throw new Error(`Block with height ${height} not found`);
            }

            return data[0] as Block;
        } catch (err) {
            logger.error(`Failed to fetch single block: ${err} `);
            throw err;
        }
    }

    async insertTransaction(tx: Transaction): Promise<void> {
        try {
            await this.client.insert({
                table: 'transactions',
                values: [tx],
                format: 'JSONEachRow',
            });

            logger.debug(`Transaction inserted: tx=${tx.txhash}, height=${tx.height}`);
        } catch (err) {
            logger.error(`Failed to insert transaction: ${err}`);
            throw err;
        }
    }

    async getTxsPaginated(
        page: number = 1,
        limit: number = 10
    ): Promise<Transaction[]> {
        const offset = (page - 1) * limit;
        const query = `
        SELECT *
        FROM transactions
        WHERE txhash IN (
            SELECT txhash FROM transactions
            ORDER BY height DESC, time DESC
            LIMIT ${limit} OFFSET ${offset}
        )
        ORDER BY height DESC, time DESC
    `;

        try {
            const result = await this.client.query({
                query,
                format: 'JSONEachRow',
            });

            const data = await result.json();
            return data as Transaction[];
        } catch (err) {
            logger.error(`Failed to fetch paginated transactions: ${err}`);
            throw err;
        }
    }

    async getTransaction(
        txhash: string
    ): Promise<Transaction> {
        const query = `
        SELECT *
        FROM transactions
        WHERE txhash = '${txhash}'
        `;

        try {
            const result = await this.client.query({
                query,
                format: 'JSONEachRow',
            });

            const data = await result.json();
            if (data.length === 0) {
                throw new Error(`Transaction with txhash ${txhash} not found`);
            }

            return data[0] as Transaction;
        } catch (err) {
            logger.error(`Failed to fetch transaction: ${err} `);
            throw err;
        }
    }

    async getTxsByHeight(
        height: number
    ): Promise<Transaction[]> {
        const query = `
        SELECT *
        FROM transactions
        WHERE height = '${height}'
        `;

        try {
            const result = await this.client.query({
                query,
                format: 'JSONEachRow',
            });

            const data = await result.json();
            return data as Transaction[];
        } catch (err) {
            logger.error(`Failed to fetch transactions for block ${height}: ${err} `);
            throw err;
        }
    }
}
