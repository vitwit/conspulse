import express, { Request, Response } from 'express';
import logger from './logger/logger';
import { exit } from 'process';
import db from './db';
import { config } from './config';
import router from './routes/register.routes';
import cors from 'cors';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
dayjs.extend(utc);


// TENDERMINT Websocket section
const rpcUrl = config.RPC_URL;

if (!rpcUrl || (!rpcUrl.startsWith('http://') && !rpcUrl.startsWith('https://'))) {
    throw new Error('Invalid RPC_URL. It must start with http:// or https://');
}

const TENDERMINT_WS_URL = rpcUrl.replace(/^http/, 'ws') + '/websocket';


import WebSocket from 'ws';

let ws: WebSocket | null = null;
let reconnectTimeout: NodeJS.Timeout | null = null;

interface JsonRpcRequest {
    jsonrpc: '2.0';
    method: string;
    id: string | number;
    params?: Record<string, unknown>;
}

interface BlockHeader {
    height: string;
    time: string;
    chain_id: string;
    [key: string]: any;
}

interface BlockData {
    txs?: string[]; // Base64-encoded transaction strings
}

interface Block {
    header: BlockHeader;
    data: BlockData;
}

interface NewBlockEventData {
    type: 'tendermint/event/NewBlock';
    value: {
        block: Block;
    };
}

interface JsonRpcEvent {
    jsonrpc: '2.0';
    id?: string | number;
    result?: {
        data?: NewBlockEventData;
        query?: string;
    };
    error?: {
        code: number;
        message: string;
        data?: string;
    };
}

let lastBlockTime: dayjs.Dayjs | null = null;
let totalBlockTimeDiff = 0;
let blockIntervalCount = 0;
let averageBlockTime: number = 0;

const blockTimeBuckets: { [key: string]: number } = {
    '0-0.5s': 0,
    '0.5-1s': 0,
    '1-1.5s': 0,
    '1.5-2s': 0,
    '2-2.5s': 0,
    '2.5s+': 0,
};



function connect(): void {
    ws = new WebSocket(TENDERMINT_WS_URL);

    ws.on('open', () => {
        logger.info('[WebSocket] Connected');

        const subscribeMessage: JsonRpcRequest = {
            jsonrpc: '2.0',
            method: 'subscribe',
            id: '1',
            params: {
                query: "tm.event='NewBlock'",
            },
        };

        ws?.send(JSON.stringify(subscribeMessage));
    });

    ws.on('message', async (data: WebSocket.Data) => {
        try {
            const message = JSON.parse(data.toString()) as JsonRpcEvent;

            if (message.result?.data?.type === 'tendermint/event/NewBlock') {
                const block = message.result.data.value.block;
                const blockTime = dayjs(block.header.time).utc().format('YYYY-MM-DD HH:mm:ss.SSSSSSSSS');

                // --- Calculate time difference from last block ---
                if (lastBlockTime) {
                    const diff = dayjs(block.header.time).diff(lastBlockTime);
                    totalBlockTimeDiff += diff;
                    blockIntervalCount++;

                    averageBlockTime = totalBlockTimeDiff / blockIntervalCount;
                    logger.info(`[BlockTime] Avg block time: ${(averageBlockTime / 1000).toFixed(2)}s`);
                    const cbt = dayjs(block.header.time);

                    const diffMs = cbt.diff(lastBlockTime);
                    const diffSec = diffMs / 1000;

                    if (diffSec <= 0.5) blockTimeBuckets['0-0.5s']++;
                    else if (diffSec <= 1) blockTimeBuckets['0.5-1s']++;
                    else if (diffSec <= 1.5) blockTimeBuckets['1-1.5s']++;
                    else if (diffSec <= 2) blockTimeBuckets['1.5-2s']++;
                    else if (diffSec <= 2.5) blockTimeBuckets['2-2.5s']++;
                    else blockTimeBuckets['2.5s+']++;
                }

                lastBlockTime = dayjs(block.header.time);

                cacheBlock(parseInt(block.header.height), new Date(block.header.time).getTime(), block.data.txs?.length || 0);

                await db.insertBlock({
                    app_hash: block.header['app_hash'],
                    chain_id: block.header.chain_id,
                    consensus_hash: block.header['consensus_hash'],
                    data_hash: block.header['data_hash'],
                    evidence_hash: block.header['evidence_hash'],
                    height: parseInt(block.header.height),
                    last_commit_hash: block.header['last_commit_hash'],
                    last_results_hash: block.header['last_results_hash'],
                    next_validators_hash: block.header['next_validators_hash'],
                    proposer_address: block.header['proposer_address'],
                    transactions: block.data.txs?.length || 0,
                    validators_hash: block.header['validators_hash'],
                    time: blockTime,

                })
            }
        } catch (error) {
            logger.error('[WebSocket] Message parse error:', error);
        }
    });

    ws.on('close', () => {
        logger.warn('[WebSocket] Connection closed. Scheduling reconnect...');
        scheduleReconnect();
    });

    ws.on('error', (error) => {
        logger.error(`[WebSocket] Error: ${error.message}`);
        ws?.close(); // Ensure reconnect
    });
}

function scheduleReconnect(delay: number = 3000): void {
    if (reconnectTimeout) return;

    reconnectTimeout = setTimeout(() => {
        reconnectTimeout = null;
        logger.warn('[WebSocket] Attempting to reconnect...');
        connect();
    }, delay);
}

connect();


// REST client
const app = express();
const PORT = Number(config.PORT) || 3000;
app.use(express.json());
app.use(cors());


(async () => {
    try {
        await db.initialize();
        await db.initializeSchema("./src/db/schema.sql");

        app.use('/api', router);

        app.get('/api/stats', async (req: Request, res: Response) => {
            res.status(200).json({
                averageBlockTime: `${(averageBlockTime / 1000).toFixed(2)}s`,
                blockPropagation: blockTimeBuckets,
                blocksWindow: blockCache,
            })
        })

        app.listen(PORT, '0.0.0.0', () => {
            logger.info(`Server running at http://localhost:${PORT}`);
        });

    } catch (err: any) {
        logger.error(err);
        exit(1);
    }

})();


// CRON section for cleanup
import cron from 'node-cron';
import { blockCache, cacheBlock } from './controllers/cache';

// Schedule task to run every 10 minutes
cron.schedule('*/10 * * * *', async () => {
    logger.info(`Pruning records job started`);
    await db.cleanOldRecords();

});
