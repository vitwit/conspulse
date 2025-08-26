'use client';
import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import ShortName from './../../components/ShortName';
import NodeIdentityCell from './NodeIdentityCell';
import LatencyCell from './LatencyCell';
import { formatLatency } from '@/app/utils';

export function timeAgo(timestamp: number): string {
    const now = Date.now();
    let diff = now - timestamp * 1000; // convert seconds to milliseconds

    const SECOND = 1000;
    const MINUTE = 60 * SECOND;
    const HOUR = 60 * MINUTE;
    const DAY = 24 * HOUR;

    if (diff < SECOND) return 'just now';
    if (diff < MINUTE) return `${Math.floor(diff / SECOND)}s ago`;
    if (diff < HOUR) return `${Math.floor(diff / MINUTE)}m ago`;
    if (diff < DAY) return `${Math.floor(diff / HOUR)}h ago`;

    return `${Math.floor(diff / DAY)}d ago`;
}


interface Stats {
    address: string;
    moniker: string;
    nodeID: string;
    earliestBlockHeight: number;
    latestBlockHeight: number;
    latestAppHash: string;
    blockTime: number;
    isSyncing: boolean;
    network: string;
    votingPower: number;
    peers: any[];
    version: string;
    os: string;
    goVersion: string;
    latency: number;
}

interface Props {
    nodes: Stats[];
    sortedNodes: Stats[];
    sortBy: string;
    sortDirection: 'asc' | 'desc';
    handleSort: (key: string) => void;
    rowVariants: any;
    updatedRows: any;
    favoriteNodes: Set<string>;
    toggleFavorite: (address: string) => void;
    currentHeight: string;
}

const sortKeyMap: Record<string, keyof Stats> = {
    votingpower: 'votingPower',
    earliestheight: 'earliestBlockHeight',
    latestheight: 'latestBlockHeight',
    node: 'nodeID',
    hash: 'latestAppHash',
    blocktime: 'blockTime',
    caughtup: 'isSyncing',
};

const PeersTableTab: React.FC<Props> = ({
    nodes,
    sortedNodes,
    sortBy,
    sortDirection,
    handleSort,
    rowVariants,
    updatedRows,
    favoriteNodes,
    toggleFavorite,
    currentHeight
}) => {
    const headers = [
        '★',
        '#',
        'Node',
        'Earliest Height',
        'Latest Height',
        'Hash',
        'Block Time',
        'Caught Up',
        'Network',
        'Voting Power',
        'Peers',
        'Version',
        'OS',
        'Go Version',
        'Latency',
    ];

    return (
        <div className="overflow-x-auto mb-8 scrollbar-hide">
            <table className="min-w-full text-sm text-left rounded-lg shadow-md">
                <thead className="bg-[#2a2f3a] text-xs uppercase tracking-wider">
                    <tr>
                        {headers.map((title, index) => {
                            const key = title.toLowerCase().replace(/ /g, '');
                            const normalizedKey = sortKeyMap[key] || key;
                            const isSorted = sortBy === normalizedKey;

                            return (
                                <th
                                    key={index}
                                    onClick={() => handleSort(normalizedKey)}
                                    className="cursor-pointer px-4 py-3 whitespace-nowrap hover:text-zinc-400 transition text-zinc-500/90 select-none"
                                >
                                    <div className="flex items-center gap-1">
                                        <span>{title}</span>
                                        {(title !== "#" && title !== "★") && (
                                            <span className="flex flex-col leading-[0.8] text-[10px] ml-0.5">
                                                <span className={`${isSorted && sortDirection === 'asc' ? 'text-blue-500/80' : 'text-zinc-500/90'}`}>
                                                    ▲
                                                </span>
                                                <span className={`${isSorted && sortDirection === 'desc' ? 'text-blue-500/80' : 'text-zinc-500/90'}`}>
                                                    ▼
                                                </span>
                                            </span>
                                        )}
                                    </div>
                                </th>
                            );
                        })}
                    </tr>
                </thead>

                <tbody>
                    {nodes.length === 0 ? (
                        <tr>
                            <td colSpan={15} className="text-center py-6 text-gray-500">
                                No data available.
                            </td>
                        </tr>
                    ) : (
                        <AnimatePresence>
                            {sortedNodes.map((node: Stats, idx: number) => {

                                return (
                                    <motion.tr
                                        key={node.address || idx}
                                        layout
                                        initial="hidden"
                                        animate="visible"
                                        exit="exit"
                                        variants={rowVariants}
                                        transition={{ duration: 0.3 }}

                                        className={`
                                            hover:bg-[#2e3440]
                                            border-b border-[#2a2f3a]
                                            ${updatedRows.has(node.address) ? 'animate-fadeGreen' : ''}
                                            ${favoriteNodes.has(node.address) ? 'bg-[#3b4252]' : ''}
                                        `}
                                    >
                                        {[
                                            <button
                                                onClick={() => toggleFavorite(node.address)}
                                                className="text-xl text-yellow-400 focus:outline-none transition-transform"
                                                title={favoriteNodes.has(node.address) ? 'Unfavorite' : 'Favorite'}
                                            >
                                                {favoriteNodes.has(node.address) ? '★' : '☆'}
                                            </button>,
                                            idx + 1,
                                            <NodeIdentityCell
                                                moniker={node.moniker}
                                                nodeId={node.nodeID}
                                                address={node.address}
                                                explorerUrl={process.env.NEXT_PUBLIC_EXPLORER_URL || ""}
                                            />,

                                            node.earliestBlockHeight.toLocaleString(),
                                            <span className={
                                                parseInt(currentHeight, 10) - node.latestBlockHeight <= 5
                                                    ? 'text-gray-400'
                                                    : parseInt(currentHeight, 10) - node.latestBlockHeight <= 25
                                                        ? 'text-yellow-400'
                                                        : 'text-red-500'
                                            }>
                                                {node.latestBlockHeight.toLocaleString()}
                                            </span>,

                                            <ShortName value={node.latestAppHash} maxLength={7} />,
                                            <span className={
                                                (Date.now() - node.blockTime * 1000) / 1000 > 30
                                                    ? 'text-red-500'
                                                    : (Date.now() - node.blockTime * 1000) / 1000 > 15
                                                        ? 'text-yellow-400'
                                                        : 'text-gray-400'
                                            }>
                                                {timeAgo(node.blockTime)}
                                            </span>,
                                            node.isSyncing ? 'Syncing' : 'Yes',
                                            node.network,
                                            node.votingPower > 0 ? node.votingPower : 0,
                                            node.peers.length || 0,
                                            node.version,
                                            node.os,
                                            node.goVersion,
                                            <LatencyCell latency={node.latency} formatted={formatLatency(node.latency)} />,
                                        ].map((value, i) => (
                                            <td key={i} className="px-4 py-4 font-mono text-sm text-gray-400 whitespace-nowrap">
                                                <motion.div
                                                    initial="initial"
                                                    animate="animate"
                                                    exit="exit"
                                                    variants={rowVariants}
                                                    transition={{ duration: 0.3 }}
                                                >
                                                    {value}
                                                </motion.div>
                                            </td>
                                        ))}
                                    </motion.tr>
                                );
                            })}
                        </AnimatePresence>
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default PeersTableTab;
