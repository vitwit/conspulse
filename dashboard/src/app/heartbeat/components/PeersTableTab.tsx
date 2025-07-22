'use client';
import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import ShortName from './../../components/ShortName';
import Moniker from '@/app/components/Moniker';

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
    formatLatency: (ms: number) => string;
    rowVariants: any;
    updatedRows: any;
    favoriteNodes: Set<string>;
    toggleFavorite: (address: string) => void;
}

const sortKeyMap: Record<string, keyof Stats> = {
    votingpower: 'votingPower',
    earliestheight: 'earliestBlockHeight',
    latestheight: 'latestBlockHeight',
};

const PeersTableTab: React.FC<Props> = ({
    nodes,
    sortedNodes,
    sortBy,
    sortDirection,
    handleSort,
    formatLatency,
    rowVariants,
    updatedRows,
    favoriteNodes,
    toggleFavorite,
}) => {
    const headers = [
        '★',
        '#',
        'Moniker',
        'Node ID',
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
            <table className="min-w-full text-sm text-left text-gray-300 bg-[#1a1e24] border border-[#2a2f3a] rounded-lg shadow-md">
                <thead className="bg-[#2a2f3a] text-cyan-300 text-xs uppercase tracking-wider">
                    <tr>
                        {headers.map((title, index) => {
                            const key = title.toLowerCase().replace(/ /g, '');

                            const normalizedKey = sortKeyMap[key] || key;
                            const isSorted = sortBy === normalizedKey;

                            return (
                                <th
                                    key={index}
                                    onClick={() => handleSort(key)}
                                    className="cursor-pointer px-4 py-3 whitespace-nowrap hover:text-white transition text-teal-400 select-none"
                                >
                                    <div className="flex items-center gap-1">
                                        <span>{title}</span>
                                        {(title !== "#" && title !== "★") && (
                                            <span className="flex flex-col leading-[0.8] text-[10px] ml-0.5">
                                                <span className={`${isSorted && sortDirection === 'asc' ? 'text-white' : 'text-gray-500'}`}>
                                                    ▲
                                                </span>
                                                <span className={`${isSorted && sortDirection === 'desc' ? 'text-white' : 'text-gray-500'}`}>
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
                                            <Moniker name={node.moniker} value={`0x${node.address}`} explorerUrl={process.env.NEXT_PUBLIC_EXPLORER_URL || ""} />,
                                            <ShortName value={node.nodeID} maxLength={7} />,
                                            node.earliestBlockHeight.toLocaleString(),
                                            node.latestBlockHeight.toLocaleString(),
                                            <ShortName value={node.latestAppHash} maxLength={7} />,
                                            `${Math.floor((Date.now() - node.blockTime * 1000) / 1000)}s ago`,
                                            node.isSyncing ? 'Syncing' : 'Yes',
                                            node.network,
                                            node.votingPower > 0 ? node.votingPower : 0,
                                            node.peers.length || 0,
                                            node.version,
                                            node.os,
                                            node.goVersion,
                                            formatLatency(node.latency),
                                        ].map((value, i) => (
                                            <td key={i} className="px-4 py-2 font-mono text-sm text-gray-100 whitespace-nowrap">
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
