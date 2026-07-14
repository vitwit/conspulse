'use client';
import React, { memo, useEffect, useRef } from 'react';
import { Star } from 'lucide-react';
import ShortName from './../../components/ShortName';
import NodeIdentityCell from './NodeIdentityCell';
import LatencyCell from './LatencyCell';
import { formatLatency } from '@/app/utils';

function timeAgo(timestamp: number): string {
    const diff = Date.now() - timestamp * 1000;

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

interface NodeRowProps {
    node: Stats;
    idx: number;
    isFavorite: boolean;
    currentHeight: string;
    toggleFavorite: (address: string) => void;
}

const ROW_TICK_MS = 1200;

const NodeRow = memo(function NodeRow({
    node,
    idx,
    isFavorite,
    currentHeight,
    toggleFavorite,
}: NodeRowProps) {
    const trRef = useRef<HTMLTableRowElement>(null);
    const mountedRef = useRef(false);

    useEffect(() => {
        if (!mountedRef.current) {
            mountedRef.current = true;
            return;
        }

        const row = trRef.current;
        if (!row) return;

        row.classList.remove('node-row-tick');
        void row.offsetWidth;
        row.classList.add('node-row-tick');

        const timer = window.setTimeout(() => {
            row.classList.remove('node-row-tick');
        }, ROW_TICK_MS);

        return () => window.clearTimeout(timer);
    }, [node]);

    const heightDiff =
        Number(String(currentHeight).replace(/,/g, '')) - node.latestBlockHeight;
    const latestColor =
        heightDiff <= 5 ? 'text-slate-300' : heightDiff <= 25 ? 'text-amber-400' : 'text-rose-400';

    const ageSec = (Date.now() - node.blockTime * 1000) / 1000;
    const blockTimeColor =
        ageSec > 30 ? 'text-rose-400' : ageSec > 15 ? 'text-amber-400' : 'text-slate-400';

    return (
        <tr
            ref={trRef}
            data-row-key={`${node.address}-${node.nodeID}`}
            className={isFavorite ? '!bg-cyan-400/[0.04]' : undefined}
        >
            <td className="font-mono text-[13px]">
                <button
                    onClick={() => toggleFavorite(node.address)}
                    className="focus:outline-none cursor-pointer transition-transform hover:scale-110"
                    title={isFavorite ? 'Unfavorite' : 'Favorite'}
                >
                    <Star
                        size={16}
                        className={isFavorite ? 'fill-amber-400 text-amber-400' : 'text-slate-600 hover:text-amber-400'}
                    />
                </button>
            </td>
            <td className="font-mono text-[13px] text-slate-600">{idx + 1}</td>
            <td className="font-mono text-[13px]">
                <NodeIdentityCell
                    moniker={node.moniker}
                    nodeId={node.nodeID}
                    address={node.address}
                    explorerUrl={process.env.NEXT_PUBLIC_EXPLORER_URL || ""}
                />
            </td>
            <td className="font-mono text-[13px]">{node.earliestBlockHeight.toLocaleString()}</td>
            <td className={`font-mono text-[13px] ${latestColor}`}>
                {node.latestBlockHeight.toLocaleString()}
            </td>
            <td className="font-mono text-[13px]">
                <ShortName value={node.latestAppHash} maxLength={7} />
            </td>
            <td className={`font-mono text-[13px] ${blockTimeColor}`}>
                {timeAgo(node.blockTime)}
            </td>
            <td className="font-mono text-[13px]">
                {node.isSyncing ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/10 px-2 py-0.5 text-[11px] font-semibold text-amber-400">
                        Syncing
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">
                        Yes
                    </span>
                )}
            </td>
            <td className="font-mono text-[13px]">{node.network}</td>
            <td className="font-mono text-[13px]">
                {node.votingPower > 0 ? node.votingPower.toLocaleString() : 0}
            </td>
            <td className="font-mono text-[13px]">{node.peers.length || 0}</td>
            <td className="font-mono text-[13px]">
                <span className="rounded-md bg-white/[0.04] border border-[var(--edge)] px-2 py-0.5 text-[11px]">
                    {node.version}
                </span>
            </td>
            <td className="font-mono text-[13px]">{node.os}</td>
            <td className="font-mono text-[13px]">{node.goVersion}</td>
            <td className="font-mono text-[13px]">
                <LatencyCell latency={node.latency} formatted={formatLatency(node.latency)} />
            </td>
        </tr>
    );
}, (prev, next) =>
    prev.node === next.node &&
    prev.idx === next.idx &&
    prev.isFavorite === next.isFavorite &&
    prev.currentHeight === next.currentHeight
);

const PeersTableTab: React.FC<Props> = ({
    nodes,
    sortedNodes,
    sortBy,
    sortDirection,
    handleSort,
    favoriteNodes,
    toggleFavorite,
    currentHeight,
}) => {
    const headers = [
        '★', '#', 'Node', 'Earliest Height', 'Latest Height', 'Hash',
        'Block Time', 'Caught Up', 'Network', 'Voting Power', 'Peers',
        'Version', 'OS', 'Go Version', 'Latency',
    ];

    return (
        <div className="card overflow-hidden mb-8 min-w-0">
            <div className="overflow-x-auto max-w-full">
                <table className="tbl tbl-contained">
                    <thead>
                        <tr>
                            {headers.map((title, index) => {
                                const key = title.toLowerCase().replace(/ /g, '');
                                const normalizedKey = sortKeyMap[key] || key;
                                const isSorted = sortBy === normalizedKey;

                                return (
                                    <th
                                        key={index}
                                        onClick={() => title !== "#" && title !== "★" && handleSort(normalizedKey)}
                                        className={`${title !== "#" && title !== "★" ? "cursor-pointer select-none hover:!text-slate-300" : ""} transition-colors`}
                                    >
                                        <div className="flex items-center gap-1">
                                            <span>{title}</span>
                                            {(title !== "#" && title !== "★") && (
                                                <span className="flex flex-col leading-[0.8] text-[9px] ml-0.5">
                                                    <span className={`${isSorted && sortDirection === 'asc' ? 'text-cyan-400' : 'text-slate-700'}`}>▲</span>
                                                    <span className={`${isSorted && sortDirection === 'desc' ? 'text-cyan-400' : 'text-slate-700'}`}>▼</span>
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
                                <td colSpan={15} className="text-center py-10 text-slate-500">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="skeleton h-4 w-64" />
                                        <span>Waiting for node stats…</span>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            sortedNodes.map((node: Stats, idx: number) => (
                                <NodeRow
                                    key={`${node.address}-${node.nodeID}`}
                                    node={node}
                                    idx={idx}
                                    isFavorite={favoriteNodes.has(node.address)}
                                    currentHeight={currentHeight}
                                    toggleFavorite={toggleFavorite}
                                />
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default PeersTableTab;
