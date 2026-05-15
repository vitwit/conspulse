'use client';
import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import ShortName from './../../components/ShortName';
import NodeIdentityCell from './NodeIdentityCell';
import LatencyCell from './LatencyCell';
import { formatLatency } from '@/app/utils';

export function timeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp * 1000;

  const SECOND = 1000;
  const MINUTE = 60 * SECOND;
  const HOUR   = 60 * MINUTE;
  const DAY    = 24 * HOUR;

  if (diff < SECOND) return 'just now';
  if (diff < MINUTE) return `${Math.floor(diff / SECOND)}s ago`;
  if (diff < HOUR)   return `${Math.floor(diff / MINUTE)}m ago`;
  if (diff < DAY)    return `${Math.floor(diff / HOUR)}h ago`;
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
  votingpower:    'votingPower',
  earliestheight: 'earliestBlockHeight',
  latestheight:   'latestBlockHeight',
  node:           'nodeID',
  hash:           'latestAppHash',
  blocktime:      'blockTime',
  caughtup:       'isSyncing',
};

const SortIcon = ({ asc, desc }: { asc: boolean; desc: boolean }) => (
  <span className="inline-flex flex-col leading-[0] ml-1">
    <span style={{ color: asc ? "var(--accent-blue)" : "var(--text-muted)", fontSize: 9 }}>▲</span>
    <span style={{ color: desc ? "var(--accent-blue)" : "var(--text-muted)", fontSize: 9 }}>▼</span>
  </span>
);

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
  currentHeight,
}) => {
  const headers: { label: string; sortable?: boolean }[] = [
    { label: '★' },
    { label: '#' },
    { label: 'Node',            sortable: true },
    { label: 'Earliest Height', sortable: true },
    { label: 'Latest Height',   sortable: true },
    { label: 'Hash',            sortable: true },
    { label: 'Block Time',      sortable: true },
    { label: 'Caught Up',       sortable: true },
    { label: 'Network',         sortable: true },
    { label: 'Voting Power',    sortable: true },
    { label: 'Peers',           sortable: true },
    { label: 'Version',         sortable: true },
    { label: 'OS',              sortable: true },
    { label: 'Go Version',      sortable: true },
    { label: 'Latency',         sortable: true },
  ];

  return (
    <div className="overflow-x-auto mb-8 scrollbar-hide rounded-b-lg">
      <table className="min-w-full text-sm text-left">
        {/* Header */}
        <thead>
          <tr style={{ background: "var(--bg-elevated)", borderBottom: "1px solid var(--border-default)" }}>
            {headers.map(({ label, sortable }, index) => {
              const key = label.toLowerCase().replace(/ /g, '');
              const normalizedKey = sortKeyMap[key] || key;
              const isSorted = sortBy === normalizedKey;

              return (
                <th
                  key={index}
                  onClick={() => sortable && handleSort(normalizedKey)}
                  className={`px-4 py-3 whitespace-nowrap text-xs font-semibold uppercase tracking-wider select-none ${sortable ? 'cursor-pointer' : ''}`}
                  style={{
                    color: isSorted ? "var(--accent-blue)" : "var(--text-secondary)",
                  }}
                  onMouseEnter={(e) => {
                    if (sortable) (e.currentTarget as HTMLElement).style.color = "var(--text-primary)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.color = isSorted ? "var(--accent-blue)" : "var(--text-secondary)";
                  }}
                >
                  <div className="flex items-center gap-0.5">
                    {label}
                    {sortable && (
                      <SortIcon
                        asc={isSorted && sortDirection === 'asc'}
                        desc={isSorted && sortDirection === 'desc'}
                      />
                    )}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>

        {/* Body */}
        <tbody>
          {nodes.length === 0 ? (
            <tr>
              <td
                colSpan={15}
                className="text-center py-16 text-sm"
                style={{ color: "var(--text-muted)", background: "var(--bg-primary)" }}
              >
                No node data available. Waiting for WebSocket connection…
              </td>
            </tr>
          ) : (
            <AnimatePresence>
              {sortedNodes.map((node: Stats, idx: number) => {
                const heightGap = parseInt(currentHeight, 10) - node.latestBlockHeight;
                const heightColor =
                  heightGap <= 5
                    ? "var(--text-secondary)"
                    : heightGap <= 25
                    ? "var(--accent-amber)"
                    : "var(--accent-red)";

                const blockAgeSec = (Date.now() - node.blockTime * 1000) / 1000;
                const blockAgeColor =
                  blockAgeSec > 30
                    ? "var(--accent-red)"
                    : blockAgeSec > 15
                    ? "var(--accent-amber)"
                    : "var(--text-secondary)";

                const isFav = favoriteNodes.has(node.address);

                return (
                  <motion.tr
                    key={node.address || idx}
                    layout
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    variants={rowVariants}
                    transition={{ duration: 0.25 }}
                    className={updatedRows.has(node.address) ? 'animate-fadeGreen' : ''}
                    style={{
                      background: isFav ? "rgba(88,166,255,0.06)" : "var(--bg-primary)",
                      borderBottom: "1px solid var(--border-subtle)",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background = isFav
                        ? "rgba(88,166,255,0.1)"
                        : "var(--bg-elevated)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = isFav
                        ? "rgba(88,166,255,0.06)"
                        : "var(--bg-primary)";
                    }}
                  >
                    {/* Favourite star */}
                    <td className="px-4 py-3 text-center w-10">
                      <button
                        onClick={() => toggleFavorite(node.address)}
                        className="transition-transform hover:scale-110 focus:outline-none"
                        style={{ color: isFav ? "#e3b341" : "var(--text-muted)", fontSize: 16 }}
                        title={isFav ? 'Unfavorite' : 'Favorite'}
                      >
                        {isFav ? '★' : '☆'}
                      </button>
                    </td>

                    {/* Row number */}
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--text-muted)" }}>
                      {idx + 1}
                    </td>

                    {/* Node identity */}
                    <td className="px-4 py-3">
                      <NodeIdentityCell
                        moniker={node.moniker}
                        nodeId={node.nodeID}
                        address={node.address}
                        explorerUrl={process.env.NEXT_PUBLIC_EXPLORER_URL || ""}
                      />
                    </td>

                    {/* Earliest height */}
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--text-secondary)" }}>
                      {node.earliestBlockHeight.toLocaleString()}
                    </td>

                    {/* Latest height (color-coded) */}
                    <td className="px-4 py-3 font-mono text-xs font-medium" style={{ color: heightColor }}>
                      {node.latestBlockHeight.toLocaleString()}
                    </td>

                    {/* Hash */}
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--text-secondary)" }}>
                      <ShortName value={node.latestAppHash} maxLength={7} />
                    </td>

                    {/* Block time */}
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: blockAgeColor }}>
                      {timeAgo(node.blockTime)}
                    </td>

                    {/* Caught Up */}
                    <td className="px-4 py-3">
                      {node.isSyncing ? (
                        <span
                          className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border"
                          style={{
                            color: "var(--accent-amber)",
                            borderColor: "rgba(227,179,65,0.35)",
                            background: "rgba(227,179,65,0.08)",
                          }}
                        >
                          Syncing
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border"
                          style={{
                            color: "var(--accent-green)",
                            borderColor: "rgba(63,185,80,0.35)",
                            background: "rgba(63,185,80,0.08)",
                          }}
                        >
                          Synced
                        </span>
                      )}
                    </td>

                    {/* Network */}
                    <td className="px-4 py-3 text-xs" style={{ color: "var(--text-secondary)" }}>
                      {node.network}
                    </td>

                    {/* Voting Power */}
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--text-secondary)" }}>
                      {node.votingPower > 0 ? node.votingPower.toLocaleString() : "—"}
                    </td>

                    {/* Peers */}
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--text-secondary)" }}>
                      {node.peers.length || 0}
                    </td>

                    {/* Version */}
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--text-secondary)" }}>
                      {node.version}
                    </td>

                    {/* OS */}
                    <td className="px-4 py-3 text-xs" style={{ color: "var(--text-secondary)" }}>
                      {node.os}
                    </td>

                    {/* Go Version */}
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--text-secondary)" }}>
                      {node.goVersion}
                    </td>

                    {/* Latency */}
                    <td className="px-4 py-3">
                      <LatencyCell latency={node.latency} formatted={formatLatency(node.latency)} />
                    </td>
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
