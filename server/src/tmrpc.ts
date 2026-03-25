import { config } from './config';
import { blockCache, cacheBlock } from './controllers/cache';
import { ExtendedCommitInfo } from "cosmjs-types/tendermint/abci/types";
import { VoteExtension } from './proto/vote_ext';
import { fromBase64 } from "@cosmjs/encoding";

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
import logger from './logger/logger';
import db from './db';
import { clients } from './ws';

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

interface TxResult {
    height: string;
    tx: string; // Base64-encoded tx
    result: {
        code: number;
        log: string;
        codespace?: string;
    };
}

interface TxEventData {
    type: 'tendermint/event/Tx';
    value: {
        TxResult: TxResult;
    };
}

interface JsonRpcTxEvent {
    jsonrpc: '2.0';
    id?: string | number;
    result?: {
        data?: TxEventData;
        query?: string;
    };
    error?: {
        code: number;
        message: string;
        data?: string;
    };
    events?: Record<string, string[]>;
}

function isBlockEvent(event: any): event is JsonRpcEvent & {
    result: { data: NewBlockEventData };
} {
    return event?.result?.data?.type === 'tendermint/event/NewBlock';
}

function isTxEvent(event: any): event is JsonRpcTxEvent {
    return event?.result?.data?.type === 'tendermint/event/Tx';
}

let lastBlockTime: dayjs.Dayjs | null = null;
let totalBlockTimeDiff = 0;
let blockIntervalCount = 0;
export var averageBlockTime: number = 0;

export const blockTimeBuckets: { [key: string]: number } = {
    '0-0.5s': 0,
    '0.5-1s': 0,
    '1-1.5s': 0,
    '1.5-2s': 0,
    '2-2.5s': 0,
    '2.5s+': 0,
};



export function connectWS(): void {
    ws = new WebSocket(TENDERMINT_WS_URL);

    ws.on('open', () => {
        logger.info('[WebSocket] Connected');

        var subscribeMessage: JsonRpcRequest = {
            jsonrpc: '2.0',
            method: 'subscribe',
            id: '1',
            params: {
                query: "tm.event='NewBlock'",
            },
        };

        ws?.send(JSON.stringify(subscribeMessage));

        subscribeMessage = {
            jsonrpc: '2.0',
            method: 'subscribe',
            id: '2',
            params: {
                query: "tm.event='Tx'",
            },
        };

        ws?.send(JSON.stringify(subscribeMessage));
    });

    ws.on('message', async (data: WebSocket.Data) => {
        try {
            const response = JSON.parse(data.toString());
            if (isBlockEvent(response)) {
                const block = response.result.data.value.block;
                const blockTime = dayjs(block.header.time).utc().format('YYYY-MM-DD HH:mm:ss.SSSSSSSSS');

                // --- Calculate time difference from last block ---
                if (lastBlockTime) {
                    const diff = dayjs(block.header.time).diff(lastBlockTime);
                    totalBlockTimeDiff += diff;
                    blockIntervalCount++;

                    averageBlockTime = totalBlockTimeDiff / blockIntervalCount;
                    logger.debug(`[BlockTime] Avg block time: ${(averageBlockTime / 1000).toFixed(2)}s`);
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

                broadcastNetworkStats();
            } else if (isTxEvent(response)) {
                const txBase64 = response.result!.data!.value.TxResult.tx;
                const txBytes = Buffer.from(txBase64, "base64");

                const info = ExtendedCommitInfo.decode(txBytes);

                console.log("Decoded VoteExtension:", info);
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
        connectWS();
    }, delay);
}

function broadcastNetworkStats(): void {
    const message: any = {
        type: "network_stats",
        averageBlockTime: `${(averageBlockTime / 1000).toFixed(2)}s`,
        blockPropagation: blockTimeBuckets,
        blocksWindow: blockCache,
    }
    const bz = JSON.stringify(message);
    for (const client of clients) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(bz);
        }
    }
}
