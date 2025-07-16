'use client';
import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import ShortName from './../../components/ShortName';

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
}

const PeersTableTab: React.FC<Props> = ({
    nodes,
    sortedNodes,
    sortBy,
    sortDirection,
    handleSort,
    formatLatency,
    rowVariants,
}) => {
    const headers = [
        'Validator Address',
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
                            const isSorted = sortBy === key;
                            return (
                                <th
                                    key={index}
                                    onClick={() => handleSort(key)}
                                    className="cursor-pointer px-4 py-3 whitespace-nowrap hover:text-white transition text-teal-400"
                                >
                                    {title} {isSorted ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
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
                            {sortedNodes.map((node: Stats, idx: number) => (
                                <motion.tr
                                    key={node.address || idx}
                                    layout
                                    initial="hidden"
                                    animate="visible"
                                    exit="exit"
                                    variants={rowVariants}
                                    transition={{ duration: 0.3 }}
                                    className="hover:bg-[#2e3440] border-b border-[#2a2f3a]"
                                >
                                    {[
                                        <ShortName key={node.address} value={node.address} maxLength={9} />,
                                        node.moniker,
                                        <ShortName key={node.nodeID} value={node.nodeID} maxLength={7} />,
                                        node.earliestBlockHeight.toLocaleString(),
                                        node.latestBlockHeight.toLocaleString(),
                                        <ShortName key={node.latestAppHash} value={node.latestAppHash} maxLength={7} />,
                                        `${Math.floor((Date.now() - node.blockTime * 1000) / 1000)}s ago`,
                                        node.isSyncing ? 'Syncing' : 'Yes',
                                        node.network,
                                        node.votingPower,
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
                                                {value || '—'}
                                            </motion.div>
                                        </td>
                                    ))}
                                </motion.tr>
                            ))}
                        </AnimatePresence>
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default PeersTableTab;
