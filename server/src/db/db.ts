import { createClient } from '@clickhouse/client';
import * as fs from 'fs/promises';
import * as path from 'path';
import logger from './../logger/logger';

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



export class Database {
    private client: ReturnType<typeof createClient>;

    constructor(host: string, username: string, password: string, database?: string) {
        this.client = createClient({
            url: host,
            username: username,
            password: password,
            database: database,
        });
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

        logger.info(`Node registered: ${node.address}`);
    }

    async storeNodeStats(stats: NodeStats): Promise<void> {
        try {
            await this.client.insert({
                table: 'node_stats',
                values: [stats],
                format: 'JSONEachRow',
            });
        } catch (err) {
            console.log(err);
            throw err;
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

        logger.info(`Node updated: ${node.address}`);
    }

    async isNodeRegistered(address: string): Promise<boolean> {
        const query = `
        SELECT count() as count
        FROM nodes
        WHERE address = {address:String}
    `;

        try {
            const result = await this.client.query({
                query,
                query_params: { address },
                format: 'JSON',
            });

            const rows: any = await result.json<{ count: number }[]>();
            return rows?.data[0]?.count > 0;
        } catch (err) {
            logger.error('Failed to check if node is registered:', err);
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
        const cutoffQuery = `
    WITH ranked AS (
        SELECT
            address,
            height,
            row_number() OVER (PARTITION BY address ORDER BY height DESC) AS rn
        FROM node_stats
    )
    SELECT
        address,
        MIN(height) AS minHeightToKeep
    FROM ranked
    WHERE rn <= 5000
    GROUP BY address
  `;

        try {
            const result: CutoffResult[] = await this.client
                .query({ query: cutoffQuery, format: 'JSONEachRow' })
                .then((res) => res.json());

            for (const row of result) {
                const { address, minHeightToKeep } = row;

                const deleteQuery = `
        ALTER TABLE node_stats
        DELETE WHERE address = '${address}' AND height < ${minHeightToKeep}
      `;

                logger.info(`Cleaning ${address} below height ${minHeightToKeep}`);
                await this.client.command({ query: deleteQuery });
            }

            logger.info('Cleanup completed.');
        } catch (error) {
            logger.error('Error during cleanup:', error);
        }
    }
}
