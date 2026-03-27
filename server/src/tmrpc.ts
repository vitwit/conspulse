import { config } from './config';
import { blockCache, cacheBlock } from './controllers/cache';
import { DecodedTxRaw, decodeTxRaw } from "@cosmjs/proto-signing";
import { ExtendedCommitInfo } from "./proto/tendermint/abci/types";
import { VoteExtension } from './proto/heimdallv2/sidetxs/vote_ext';
import { MsgCheckpoint } from './proto/heimdallv2/checkpoint/tx';

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

interface BlockLastCommit {
    height: string;
    round: number;
    signatures: any[];
    [key: string]: any;
}

interface BlockData {
    txs?: string[]; // Base64-encoded transaction strings
}

interface Block {
    header: BlockHeader;
    data: BlockData;
    last_commit: BlockLastCommit;
}

interface NewBlockEventData {
    type: 'tendermint/event/NewBlock';
    value: {
        block: Block;
        result_finalize_block: any;
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
        raw_log?: string;
        codespace?: string;
        data: string;
        gas_wanted: string;
        gas_used: string;
        events: any[];
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
        events?: Record<string, string[]>;
    };
    error?: {
        code: number;
        message: string;
        data?: string;
    };
}

interface CommitData {
    height: number;
    round: number;
    votes: VoteData[];
}

interface VoteData {
    validator_address: string;
    power: number;
    block_id_flag: string;

    extension_signature: string;

    side_tx_responses: SideTxData[] | null;
    milestone_proposition?: MilestoneData;

    non_rp_vote_extension: any;
    non_rp_extension_signature: string;
}

interface SideTxData {
    tx_hash: string;
    result: string;
}

interface MilestoneData {
    block_hashes: string[];
    start_block_number: number;
    parent_hash: string;
}

interface SummaryData {
    milestone_voting_power: Record<string, string>;
    side_tx_voting_power: Record<string, Record<string, string>>;
    non_rp_voting_power: Record<string, string>;
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
                const block_events = response.result.data.value.result_finalize_block;
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
                    signatures: JSON.stringify(block.last_commit.signatures),
                    result_finalize_block: block_events,
                })

                broadcastNetworkStats();
            } else if (isTxEvent(response)) {
                try {
                    const txResult = response.result!.data!.value.TxResult;
                    const txBase64 = txResult.tx;
                    const txBytes = Buffer.from(txBase64, "base64");
                    const events = response.result!.events || {};

                    const txRaw = isRealCosmosTx(txBytes)
                    if (txRaw) {
                        await handleRealTx(txResult, txRaw, events);
                    } else {
                        await handleSideTx(txBytes, Number(txResult.height));
                    }

                } catch (err) {
                    logger.error(`[TxEvent] Fatal error: ${err}`);
                }
            }
        } catch (err) {
            logger.error(`[WebSocket] Message parse error: ${err} ${data}'`);
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

function isRealCosmosTx(txBytes: Uint8Array): DecodedTxRaw | null {
    try {
        const tx = decodeTxRaw(txBytes);

        return (tx.body?.messages?.length > 0 &&
            tx.authInfo?.signerInfos?.length > 0 &&
            tx.signatures?.length > 0) ? tx : null;
    } catch {
        return null;
    }
}

async function handleRealTx(
    txResult: TxResult,
    txRaw: DecodedTxRaw,
    events: Record<string, string[]>
) {
    try {
        const txhash = events["tx.hash"]?.[0];
        const height = Number(txResult.height);

        logger.debug(`✅ Real Tx: ${txhash}`);

        const messages = txRaw.body.messages;

        // Sender from events
        const sender = events["message.sender"]?.[0] || '';

        // Fee
        let fee = '';
        if (txRaw.authInfo?.fee?.amount?.length) {
            fee = txRaw.authInfo.fee.amount.map(a => a.amount + a.denom).join(',');
        }

        const blockInfo = blockCache.find(x => x.blockNumber == height);
        const blockTime = blockInfo ? dayjs(blockInfo.blockTime).utc().format('YYYY-MM-DD HH:mm:ss.SSSSSSSSS') :
            dayjs.utc().format('YYYY-MM-DD HH:mm:ss.SSSSSSSSS')

        const txData = {
            txhash: (events["tx.hash"]?.[0] || '').toLowerCase(),
            height,
            time: blockTime,
            sender,
            data: txResult.result.data,
            raw_log: txResult.result.raw_log || '',
            raw_tx: JSON.stringify(txRaw, replacer),
            messages,
            events: txResult.result.events,
            gas_wanted: Number(txResult.result.gas_wanted) || 0,
            gas_used: Number(txResult.result.gas_used) || 0,
            fee
        };

        await db.insertTransaction(txData);
    } catch (err) {
        logger.error(`[RealTx] Failed: ${err}`);
    }
}

async function handleSideTx(txBytes: Uint8Array, height: number) {
    try {
        const ext = ExtendedCommitInfo.decode(txBytes);

        const commitJson = buildCommitJSON(height, ext);
        const summaryJson = buildSummaryJSON(height, ext);

        await db.updateSideTxInfo(height, commitJson, summaryJson);
    } catch (err) {
        logger.error(`[SideTx] Unknown tx format: ${err}`);
    }
}

export function buildCommitJSON(height: number, ext: ExtendedCommitInfo): CommitData {
    return {
        height,
        round: ext.round,
        votes: ext.votes.map((v) => {
            let ves: VoteExtension | null = null;
            try {
                ves = VoteExtension.decode(v.voteExtension);
            } catch {
                ves = null;
            }

            const vote: VoteData = {
                validator_address: toEthHex(v.validator?.address || new Uint8Array()),
                power: Number(v.validator?.power || 0),
                block_id_flag: mapBlockIdFlag(v.blockIdFlag),
                extension_signature: toEthHex(v.extensionSignature),

                side_tx_responses: null,
                non_rp_vote_extension: null,
                non_rp_extension_signature: toEthHex(v.nonRpExtensionSignature)
            };

            // SideTx
            vote.side_tx_responses = null;
            if (ves && ves.sideTxResponses && ves.sideTxResponses.length > 0) {
                vote.side_tx_responses = ves.sideTxResponses.map((r: any) => ({
                    tx_hash: toEthHex(r.txHash),
                    result: r.result?.toString?.() || ""
                }));
            }

            // Milestone
            const mp = ves?.milestoneProposition;

            const hasMilestoneData =
                mp &&
                mp.blockHashes?.length > 0 &&
                mp.startBlockNumber > 0 &&
                mp.parentHash?.length > 0;

            if (hasMilestoneData) {
                vote.milestone_proposition = {
                    block_hashes: mp.blockHashes.map((bh: Uint8Array) => toEthHex(bh)),
                    start_block_number: Number(mp.startBlockNumber),
                    parent_hash: toEthHex(mp.parentHash)
                };
            }

            // Non-RP
            if (v.nonRpVoteExtension?.length) {
                try {
                    const checkpoint = decodeCheckpoint(v.nonRpVoteExtension);

                    if (
                        checkpoint.startBlock ||
                        checkpoint.endBlock ||
                        checkpoint.rootHash?.length
                    ) {
                        vote.non_rp_vote_extension = {
                            proposer: checkpoint.proposer || "",
                            start_block: Number(checkpoint.startBlock || 0),
                            end_block: Number(checkpoint.endBlock || 0),
                            root_hash: toEthHex(checkpoint.rootHash || new Uint8Array()),
                            account_root_hash: toEthHex(checkpoint.accountRootHash || new Uint8Array()),
                            bor_chain_id: checkpoint.borChainId || ""
                        };
                    } else {
                        vote.non_rp_vote_extension = toEthHex(v.nonRpVoteExtension);
                    }

                } catch {
                    vote.non_rp_vote_extension = toEthHex(v.nonRpVoteExtension);
                }
            }

            return vote;
        })
    };
}

export function buildSummaryJSON(height: number, ext: ExtendedCommitInfo): SummaryData {
    let totalPower = 0;

    for (const v of ext.votes) {
        totalPower += Number(v.validator?.power || 0);
    }

    const milestoneVP: Record<string, number> = {};
    const sideTxVP: Record<string, Record<string, number>> = {};
    const nonRpVP: Record<string, number> = {};

    for (const v of ext.votes) {
        const power = Number(v.validator?.power || 0);

        let ves: VoteExtension | null = null;
        try {
            ves = VoteExtension.decode(v.voteExtension);
        } catch {
            ves = null;
        }

        // Milestone
        const mp = ves?.milestoneProposition;

        const hasMilestoneData =
            mp &&
            mp.blockHashes?.length > 0 &&
            mp.startBlockNumber > 0 &&
            mp.parentHash?.length > 0;

        if (hasMilestoneData) {
            for (const h of mp.blockHashes) {
                const key = toEthHex(h);
                milestoneVP[key] = (milestoneVP[key] || 0) + power;
            }
        }

        // SideTx
        if (ves?.sideTxResponses) {
            for (const r of ves.sideTxResponses) {
                const txKey = toEthHex(r.txHash);
                const res = r.result?.toString?.() || "";

                if (!sideTxVP[txKey]) sideTxVP[txKey] = {};
                sideTxVP[txKey][res] = (sideTxVP[txKey][res] || 0) + power;
            }
        }

        // Non-RP
        if (v.nonRpVoteExtension?.length) {
            let key: string;

            try {
                const checkpoint = decodeCheckpoint(v.nonRpVoteExtension);

                key = JSON.stringify({
                    proposer: checkpoint.proposer,
                    start_block: Number(checkpoint.startBlock),
                    end_block: Number(checkpoint.endBlock),
                    root_hash: toEthHex(checkpoint.rootHash),
                    account_root_hash: toEthHex(checkpoint.accountRootHash),
                    bor_chain_id: checkpoint.borChainId
                });
            } catch {
                key = toEthHex(v.nonRpVoteExtension);
            }

            nonRpVP[key] = (nonRpVP[key] || 0) + power;
        }
    }

    const summary: SummaryData = {
        milestone_voting_power: {},
        side_tx_voting_power: {},
        non_rp_voting_power: {}
    };

    for (const k in milestoneVP) {
        summary.milestone_voting_power[k] = formatVP(milestoneVP[k], totalPower);
    }

    for (const tx in sideTxVP) {
        summary.side_tx_voting_power[tx] = {};
        for (const res in sideTxVP[tx]) {
            summary.side_tx_voting_power[tx][res] = formatVP(sideTxVP[tx][res], totalPower);
        }
    }

    for (const k in nonRpVP) {
        summary.non_rp_voting_power[k] = formatVP(nonRpVP[k], totalPower);
    }

    return summary;
}

function mapBlockIdFlag(flag: number): string {
    switch (flag) {
        case 0: return "BLOCK_ID_FLAG_UNKNOWN";
        case 1: return "BLOCK_ID_FLAG_ABSENT";
        case 2: return "BLOCK_ID_FLAG_COMMIT";
        case 3: return "BLOCK_ID_FLAG_NIL";
        default: return "BLOCK_ID_FLAG_UNKNOWN";
    }
}

function hasField(bytes: Uint8Array, fieldNumber: number): boolean {
    const tag = (fieldNumber << 3) | 2; // length-delimited

    for (let i = 0; i < bytes.length; i++) {
        if (bytes[i] === tag) {
            return true;
        }
    }
    return false;
}

// Used to console bigInt included json without any issue
function replacer(key: string, value: any) {
    if (typeof value === 'bigint') {
        return value.toString(); // convert BigInt to string
    }
    if (Buffer.isBuffer(value) || value instanceof Uint8Array) {
        return Buffer.from(value).toString('hex'); // convert Buffer to hex
    }
    return value;
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

function decodeCheckpoint(bytes: Uint8Array) {
    return MsgCheckpoint.decode(bytes);
}

function formatVP(vp: number, total: number): string {
    const pct = total === 0 ? 0 : (vp / total) * 100;
    return `${vp} (${pct.toFixed(2)}%)`;
}

function toEthHex(bytes: Uint8Array): string {
    return "0x" + Buffer.from(bytes).toString("hex");
}
