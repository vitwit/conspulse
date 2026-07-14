"use client";

import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import throttle from "lodash/throttle";

import dynamic from "next/dynamic";

import equal from "fast-deep-equal";
import NodeVersionsChart from "./components/NodeVersions";
import {
  Layers,
  Shuffle,
  RotateCcw,
  Users,
  Shield,
  Clock,
  Timer,
  Vote,
  User,
  Server,
  GitBranch,
  CheckCircle2,
  Activity,
  ArrowLeftRight,
  Globe2,
} from "lucide-react";
import { BlockPropagationGraph } from "./heartbeat/components/BlockPropagationGraph";
import BarChart from "./heartbeat/components/Barchart";
import { BlockVotesPanel, parseCommitBitArray } from "./heartbeat/components/BlockVotesPanel";
import { ErrorAlert } from "./heartbeat/components/ErrorAlert";
import { timeAgo } from "./utils";
import { useWebSocket } from './context/WebsocketContext';
import { NetworkMessage, Stats } from "./types/ws";
import { SupportUS } from "./components/SupportUs";
import LastBlockConsensusTab from "./heartbeat/components/LastBlockConsensus";
import PeersTableTab from "./heartbeat/components/PeersTableTab";
import { useTendermint } from "./context/TendermintListener";
import { isEqual } from "lodash";
import ShortProposerName from "./components/ShortProposer";
import DescriptionTooltip from "./components/DescriptionTooltip";

const SORT_BY_KEY = 'heartbeatSortBy';
const SORT_DIRECTION_KEY = 'heartbeatSortDirection';

function nodeNeedsUpdate(old: Stats, incoming: Stats): boolean {
  return (
    old.latestBlockHeight !== incoming.latestBlockHeight ||
    old.latestAppHash !== incoming.latestAppHash ||
    old.blockTime !== incoming.blockTime ||
    old.isSyncing !== incoming.isSyncing ||
    old.votingPower !== incoming.votingPower ||
    old.version !== incoming.version ||
    old.moniker !== incoming.moniker ||
    old.nodeID !== incoming.nodeID ||
    old.earliestBlockHeight !== incoming.earliestBlockHeight ||
    old.network !== incoming.network ||
    old.os !== incoming.os ||
    old.goVersion !== incoming.goVersion ||
    (old.peers?.length ?? 0) !== (incoming.peers?.length ?? 0) ||
    Math.abs(old.latency - incoming.latency) >= 250
  );
}

const NodeMap = dynamic(() => import("./components/NodeMap"), {
  ssr: false,
});


const colorClasses: Record<string, string> = {
  cyan: "text-cyan-400",
  emerald: "text-emerald-400",
  violet: "text-violet-400",
  stone: "text-slate-300",
  blue: "text-sky-400",
  indigo: "text-indigo-400",
  lime: "text-lime-400",
  fuchsia: "text-fuchsia-400",
  pink: "text-pink-400",
  amber: "text-amber-400",
};

const iconBgClasses: Record<string, string> = {
  cyan: "bg-cyan-400/10 text-cyan-400",
  emerald: "bg-emerald-400/10 text-emerald-400",
  violet: "bg-violet-400/10 text-violet-400",
  stone: "bg-slate-400/10 text-slate-300",
  blue: "bg-sky-400/10 text-sky-400",
  indigo: "bg-indigo-400/10 text-indigo-400",
  lime: "bg-lime-400/10 text-lime-400",
  fuchsia: "bg-fuchsia-400/10 text-fuchsia-400",
  pink: "bg-pink-400/10 text-pink-400",
  amber: "bg-amber-400/10 text-amber-400",
};


const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL;
const DUMP_CONSENSUS_URL = `${RPC_URL}/dump_consensus_state`;
const NET_INFO_URL = `${RPC_URL}/net_info`;

function buildNodeLocations(nodes: Stats[]) {
  return nodes.map((node) => ({
    latitude: node.latitude,
    longitude: node.longitude,
    nodeName: node.country,
    radius: 8,
    fillKey: "success" as const,
  }));
}

export default function NetstatsPage() {
  const [dump, setDump] = useState<any>(null);
  const [netInfo, setNetInfo] = useState<any>(null);
  const [errorDump, setErrorDump] = useState<string | null>(null);
  const [errorNet, setErrorNet] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "peers" | "consensus" | "versions"
  >("peers");
  const [nodes, setNodes] = useState<Stats[]>([]);
  const [versions, setVersions] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<string>("latestBlockHeight");
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>("desc");
  const [height, setHeight] = useState<string>("");
  const [step, setStep] = useState<number>(0);
  const [round, setRound] = useState<number>(0);
  const [proposer, setProposer] = useState<string>("");
  const [lastBlockTime, setLastBlockTime] = useState(new Date());
  const [favoriteNodes, setFavoriteNodes] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState<NetworkMessage>();

  const { networkStats, nodesStats } = useWebSocket();
  const event = useTendermint();

  const prevStatsRef = useRef<any>(null);
  const nodesLocationCacheRef = useRef<{ nodes: Stats[]; locations: ReturnType<typeof buildNodeLocations> } | null>(null);

  const applyStats = useRef(
    throttle((incoming: Stats[]) => {
      setNodes((prev) => {
        if (equal(prev, incoming)) return prev;

        const nodeKey = (n: Stats) => `${n.address}-${n.nodeID}`;
        const prevMap = new Map(prev.map((n) => [nodeKey(n), n]));
        let anyChanged = prev.length !== incoming.length;

        const merged = incoming.map((node) => {
          const old = prevMap.get(nodeKey(node));
          if (!old) {
            anyChanged = true;
            return node;
          }
          if (equal(old, node)) return old;
          if (!nodeNeedsUpdate(old, node)) return old;
          anyChanged = true;
          return node;
        });

        if (!anyChanged) return prev;

        prevStatsRef.current = incoming;
        setVersions(incoming.map((s) => s.version));
        return merged;
      });
    }, 2000, { leading: true, trailing: true })
  ).current;

  const numericSortFields = new Set([
    'latestBlockHeight', 'earliestBlockHeight', 'votingPower', 'latency', 'blockTime',
  ]);

  const sortedNodes = useMemo(() => {
    return [...nodes]
      .sort((a, b) => {
        const aFav = favoriteNodes.has(a.address);
        const bFav = favoriteNodes.has(b.address);
        if (aFav !== bFav) return aFav ? -1 : 1;

        const aVal = a[sortBy as keyof Stats];
        const bVal = b[sortBy as keyof Stats];

        let cmp = 0;
        if (sortBy === 'peers') {
          cmp = (a.peers?.length ?? 0) - (b.peers?.length ?? 0);
        } else if (numericSortFields.has(sortBy)) {
          cmp = Number(aVal ?? 0) - Number(bVal ?? 0);
        } else {
          cmp = String(aVal).localeCompare(String(bVal));
        }

        if (cmp === 0) {
          cmp = b.latestBlockHeight - a.latestBlockHeight;
        }

        return sortDirection === 'asc' ? cmp : -cmp;
      });
  }, [nodes, sortBy, sortDirection, favoriteNodes]);

  const nodesLocation = useMemo(() => {
    if (nodesLocationCacheRef.current && equal(nodesLocationCacheRef.current.nodes, nodes)) {
      return nodesLocationCacheRef.current.locations;
    }
    const locations = buildNodeLocations(nodes);
    nodesLocationCacheRef.current = { nodes, locations };
    return locations;
  }, [nodes]);

  const fetchDump = useCallback(async () => {
    setErrorDump(null);
    try {
      const res = await fetch(DUMP_CONSENSUS_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setDump(data);
    } catch (err: any) {
      setErrorDump(err.message || "Unknown error");
      setDump(null);
    }
  }, []);

  const fetchNetInfo = useCallback(async () => {
    setErrorNet(null);
    try {
      const res = await fetch(NET_INFO_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setNetInfo(data);
    } catch (err: any) {
      setErrorNet(err.message || "Unknown error");
      setNetInfo(null);
    }
  }, []);

  const toggleFavorite = (address: string) => {
    setFavoriteNodes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(address)) {
        newSet.delete(address);
      } else {
        newSet.add(address);
      }
      return newSet;
    });
  };

  useEffect(() => {
    if (!event) return;

    const timeout = setTimeout(() => {
      if (event.height) {
        const heightNum = Number(event.height);
        if (!isNaN(heightNum)) {
          const formattedHeight = heightNum.toLocaleString();
          const currentHeightNum = Number(String(height).replace(/,/g, "")) || 0;
          if (heightNum !== currentHeightNum && heightNum > currentHeightNum) {
            setHeight(formattedHeight);
            setLastBlockTime(new Date());
          }
        }
      }

      if (event.round && event.round !== round) {
        setRound(event.round);
      }

      if (event.stepValue && event.stepValue !== step) {
        setStep(event.stepValue);
      }

      if (event.proposer && event.proposer !== proposer) {
        setProposer(event.proposer);
      }
    }, 100);

    return () => clearTimeout(timeout);
  }, [event, height, round, step, proposer]);

  useEffect(() => {
    const stored = localStorage.getItem(SORT_BY_KEY);
    if (stored) {
      setSortBy(stored);
    } else {
      localStorage.setItem(SORT_BY_KEY, "latestBlockHeight");
    }

    const storedDir = localStorage.getItem(SORT_DIRECTION_KEY);
    if (storedDir === "asc" || storedDir === "desc") {
      setSortDirection(storedDir);
    } else {
      setSortDirection("desc");
      localStorage.setItem(SORT_DIRECTION_KEY, "desc");
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(SORT_BY_KEY, sortBy);
  }, [sortBy]);

  useEffect(() => {
    localStorage.setItem(SORT_DIRECTION_KEY, sortDirection);
  }, [sortDirection]);

  useEffect(() => {
    if (nodesStats?.stats) {
      applyStats(nodesStats.stats);
    }
  }, [nodesStats, applyStats]);

  useEffect(() => {
    fetchDump();
    const interval = setInterval(() => {
      fetchDump();
    }, 5_000);
    return () => clearInterval(interval);
  }, [fetchDump]);

  useEffect(() => {
    fetchNetInfo();
    const interval = setInterval(fetchNetInfo, 5_000);
    return () => clearInterval(interval);
  }, [fetchNetInfo]);

  useEffect(() => {
    if (activeTab === "consensus") {
      fetchDump();
      const interval = setInterval(fetchDump, 5_000);
      return () => clearInterval(interval);
    }
  }, [fetchDump, activeTab]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!isEqual(stats, networkStats)) {
        setStats(networkStats);
      }
    }, 100);

    return () => clearTimeout(timeout);
  }, [networkStats, stats]);

  const sortKeyMap: Record<string, keyof Stats> = {
    votingpower: 'votingPower',
    earliestheight: 'earliestBlockHeight',
    latestheight: 'latestBlockHeight',
  };

  const handleSort = (key: string) => {
    const normalizedKey = sortKeyMap[key.toLowerCase()] || key;

    if (sortBy === normalizedKey) {
      setSortDirection(prev => {
        const newDirection = prev === 'asc' ? 'desc' : 'asc';
        localStorage.setItem(SORT_DIRECTION_KEY, newDirection);
        return newDirection;
      });
    } else {
      setSortBy(normalizedKey);
      const defaultDir =
        normalizedKey === 'latestBlockHeight' || normalizedKey === 'votingPower' || normalizedKey === 'latency'
          ? 'desc'
          : 'asc';
      setSortDirection(defaultDir);

      localStorage.setItem(SORT_BY_KEY, normalizedKey);
      localStorage.setItem(SORT_DIRECTION_KEY, defaultDir);
    }
  };

  if (!RPC_URL) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-400 text-lg font-bold">
        Error: Missing NEXT_PUBLIC_RPC_URL in environment variables.
      </div>
    );
  }

  const roundState = dump?.result?.round_state;
  const proposerObj = roundState?.validators?.validators?.find?.(
    (v: any) => v.address === proposer
  );

  const roundStartTime = new Date(roundState?.start_time) || Date.now()
  const lastCommit = roundState?.last_commit;
  const lastCommitVotes = lastCommit?.votes || [];
  const lastCommitBitArray = lastCommit?.votes_bit_array || "";
  const validators = roundState?.validators?.validators || [];
  const totalVotingPower = validators.reduce(
    (sum: number, v: any) => sum + Number(v.voting_power),
    0
  );
  const nPeers = netInfo?.result?.n_peers || "—";

  const lastBlockVotesInfo = parseCommitBitArray(lastCommitBitArray);

  const blocksWindow = stats?.blocksWindow ?? [];
  const hasBlockWindow = blocksWindow.length > 0;
  const latestBlock = hasBlockWindow ? blocksWindow[blocksWindow.length - 1] : null;
  const latestBlockTimeSec = latestBlock ? (latestBlock.blockTime / 1000).toFixed(2) : null;
  const latestTxnCount = latestBlock?.txnCount;
  const propagationEntries = stats?.blockPropagation ? Object.entries(stats.blockPropagation) : [];
  const hasPropagation = propagationEntries.length > 0;
  const peakPropagation = hasPropagation
    ? propagationEntries.reduce((best, [label, count]) => (count > best.count ? { label, count } : best), {
        label: propagationEntries[0][0],
        count: propagationEntries[0][1],
      })
    : null;

  const metrics = [
    {
      title: "Latest Height",
      description: "The current block height of the blockchain, representing the total number of blocks.",
      value: height ? `#${height}` : "—",
      icon: Layers,
      accent: "blue",
      animateKey: height,
    },
    {
      title: "Avg Block Time",
      description: "The average time taken to produce a new block over recent history.",
      value: stats?.averageBlockTime ? `${stats.averageBlockTime}` : "—",
      icon: Timer,
      accent: "emerald",
    },
    {
      title: "Step",
      description: "The current consensus step of the Tendermint protocol",
      value: step || "—",
      icon: Shuffle,
      accent: "violet",
    },
    {
      title: "Round",
      description: "The current round number within the consensus process for the latest block.",
      value: round ?? "—",
      icon: RotateCcw,
      accent: "stone",
    },
    {
      title: "Total Nodes",
      description: "The number of connected peer nodes participating in the network.",
      value: nPeers ?? "—",
      icon: Users,
      accent: "cyan",
    },
    {
      title: "Validators",
      description: "The total number of active validators participating in block proposal and voting.",
      value: validators?.length || "—",
      icon: Shield,
      accent: "indigo",
    },
    {
      title: "Last Block",
      description: "The time elapsed since the most recently committed block.",
      value: lastBlockTime ? timeAgo(lastBlockTime, Date.now()) : "—",
      icon: Clock,
      accent: "stone",
    },
    {
      title: "Votes %",
      description: "The percentage of validators that signed the last block during the precommit stage.",
      value: lastBlockVotesInfo?.percent
        ? `${lastBlockVotesInfo.percent}%`
        : "—",
      icon: Vote,
      accent: "fuchsia",
    },
    {
      title: "Proposer",
      description: "The validator currently proposing the current block",
      value: <ShortProposerName value={proposer} maxLength={6} />,
      icon: User,
      accent: "cyan",
    },
    {
      title: "Proposer Voting Power",
      description: "The voting power (stake) of the current block proposer",
      value: (proposerObj && proposerObj.voting_power ? parseInt(proposerObj?.voting_power)?.toLocaleString() : "0") ?? "0",
      icon: Shield,
      accent: "amber",
    },
  ];

  const tabs: { key: "peers" | "consensus" | "versions"; label: string; icon: any }[] = [
    { key: "peers", label: "Nodes", icon: Server },
    { key: "versions", label: "Node Versions", icon: GitBranch },
    { key: "consensus", label: "Last Block Consensus", icon: CheckCircle2 },
  ]

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden">
      <SupportUS />

      <Navbar shrink={false} />
      <main className="flex-1 overflow-x-hidden">
        <section className="mx-auto max-w-[1600px] min-w-0 px-4 sm:px-6 pb-8">
          {/* Page heading */}
          <div className="flex flex-wrap items-end justify-between gap-3 pt-6 pb-2 animate-rise">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">
                Network <span className="text-gradient">Heartbeat</span>
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Live consensus, block production and node health at a glance
              </p>
            </div>
            <span className="chip">
              <span className="live-dot" />
              Live
            </span>
          </div>

          {/* Modular Error and Loading Messages */}
          <ErrorAlert
            errors={[
              {
                label: "Consensus State",
                message: errorDump,
                onRetry: fetchDump,
              },
              {
                label: "Network Info",
                message: errorNet,
                onRetry: fetchNetInfo,
              },
            ]}
          />

          {/* Metric cards */}
          <div className="stagger grid min-w-0 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4 py-4">
            {metrics.map(({ title, value, icon: Icon, accent, description, animateKey }: any) => (
              <div
                key={title}
                className="card card-hover min-w-0 px-5 py-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <DescriptionTooltip title={title} description={description || "-"} />
                  <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${iconBgClasses[accent]}`}>
                    <Icon className="w-4 h-4" />
                  </span>
                </div>
                <div
                  className={`text-xl sm:text-2xl xl:text-[1.7rem] font-mono font-bold ${colorClasses[accent]} leading-tight truncate`}
                >
                  <span key={animateKey ?? undefined} className={animateKey ? "animate-value" : undefined}>
                    {value}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Block votes — full width live panel */}
          <div className="card card-hover mb-4 min-w-0 overflow-hidden px-5 py-5">
            <div className="mb-4 flex items-center justify-between">
              <DescriptionTooltip
                title="Block Votes"
                description="Validator signatures on the last committed block. Green = signed, red = missed."
              />
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-lime-400/10 text-lime-400">
                <Vote className="w-4 h-4" />
              </span>
            </div>
            {lastCommitBitArray ? (
              <BlockVotesPanel
                bitArray={lastCommitBitArray}
                validators={validators}
                votesPercent={lastBlockVotesInfo?.percent}
              />
            ) : (
              <div className="skeleton h-24 w-full" />
            )}
          </div>

          {/* Charts */}
          <div className="stagger grid min-w-0 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="chart-panel card card-hover min-w-0 overflow-hidden p-4">
              <div className="mb-3 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <DescriptionTooltip
                      description="Distribution of block receive times after proposal."
                      title="Block Propagation"
                    />
                    {hasPropagation && <span className="live-dot scale-75" />}
                  </div>
                  <div className="chart-panel-stat mt-2 text-emerald-400">
                    {peakPropagation ? (
                      <>
                        {peakPropagation.count.toLocaleString()}
                        <span className="ml-1.5 text-xs font-normal text-slate-500">
                          peak @ {peakPropagation.label}
                        </span>
                      </>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </div>
                </div>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-400/10 text-emerald-400">
                  <Activity className="w-4 h-4" />
                </span>
              </div>
              {hasPropagation ? (
                <BlockPropagationGraph data={stats?.blockPropagation} />
              ) : (
                <div className="chart-plot skeleton h-[190px] w-full rounded-lg" />
              )}
            </div>

            <div className="chart-panel card card-hover min-w-0 overflow-hidden p-4">
              <div className="mb-3 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <DescriptionTooltip
                      title="Block Time"
                      description="Time taken to produce each block at every height."
                    />
                    {hasBlockWindow && <span className="live-dot scale-75" />}
                  </div>
                  <div className="chart-panel-stat mt-2 text-cyan-400">
                    {latestBlockTimeSec ? (
                      <>
                        {latestBlockTimeSec}s
                        <span className="ml-1.5 text-xs font-normal text-slate-500">latest block</span>
                      </>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </div>
                </div>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-400/10 text-cyan-400">
                  <Timer className="w-4 h-4" />
                </span>
              </div>
              {hasBlockWindow ? (
                <BarChart
                  data={blocksWindow.map(stat => (stat.blockTime / 1000).toFixed(2))}
                  labels={blocksWindow.map(stat => stat.blockNumber)}
                  label="Block time"
                  color="#22d3ee"
                />
              ) : (
                <div className="chart-plot skeleton h-[190px] w-full rounded-lg" />
              )}
            </div>

            <div className="chart-panel card card-hover min-w-0 overflow-hidden p-4">
              <div className="mb-3 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <DescriptionTooltip
                      title="Transactions"
                      description="Number of transactions included in each block."
                    />
                    {hasBlockWindow && <span className="live-dot scale-75" />}
                  </div>
                  <div className="chart-panel-stat mt-2 text-emerald-400">
                    {latestTxnCount != null ? (
                      <>
                        {latestTxnCount.toLocaleString()}
                        <span className="ml-1.5 text-xs font-normal text-slate-500">latest block</span>
                      </>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </div>
                </div>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-400/10 text-emerald-400">
                  <ArrowLeftRight className="w-4 h-4" />
                </span>
              </div>
              {hasBlockWindow ? (
                <BarChart
                  data={blocksWindow.map(stat => stat.txnCount)}
                  labels={blocksWindow.map(stat => stat.blockNumber)}
                  label="Transactions"
                  color="#34d399"
                  showIntegersOnly={true}
                />
              ) : (
                <div className="chart-plot skeleton h-[190px] w-full rounded-lg" />
              )}
            </div>

            <div className="chart-panel card card-hover min-w-0 overflow-hidden p-4">
              <div className="mb-3 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <DescriptionTooltip
                      title="Nodes Map"
                      description="Geographical distribution of network nodes."
                    />
                    {nodes.length > 0 && <span className="live-dot scale-75" />}
                  </div>
                  <div className="chart-panel-stat mt-2 text-cyan-400">
                    {nodes.length > 0 ? (
                      <>
                        {nodes.length.toLocaleString()}
                        <span className="ml-1.5 text-xs font-normal text-slate-500">nodes online</span>
                      </>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </div>
                </div>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-400/10 text-cyan-400">
                  <Globe2 className="w-4 h-4" />
                </span>
              </div>
              {nodes.length > 0 ? (
                <NodeMap data={nodesLocation} />
              ) : (
                <div className="chart-plot skeleton h-[190px] w-full rounded-lg" />
              )}
            </div>
          </div>

          {/* Tabs for Peers and Last Block Consensus */}
          <div className="sticky top-16 z-10 mt-6 max-w-full overflow-x-auto scrollbar-hide rounded-xl border border-[var(--edge)] bg-[#05080f] p-1.5">
            <div className="flex min-w-max gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-200 cursor-pointer ${active
                    ? "bg-gradient-to-r from-cyan-400/15 to-emerald-400/10 text-cyan-300 shadow-[inset_0_0_0_1px_rgba(34,211,238,0.25)]"
                    : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-200"
                    }`}
                >
                  <Icon size={15} />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
            </div>
          </div>

          <div className="mt-4 min-w-0">
            {activeTab === "peers" && (
              <PeersTableTab
                nodes={nodes}
                sortedNodes={sortedNodes}
                sortBy={sortBy}
                sortDirection={sortDirection}
                handleSort={handleSort}
                favoriteNodes={favoriteNodes}
                toggleFavorite={toggleFavorite}
                currentHeight={height}
              />
            )}
            {activeTab === "versions" && (
              <NodeVersionsChart versions={versions} />
            )}
            {activeTab === "consensus" && (
              <LastBlockConsensusTab
                lastCommitBitArray={lastCommitBitArray}
                validators={validators}
                totalVotingPower={totalVotingPower}
                lastCommitVotes={lastCommitVotes}
                roundStartTime={roundStartTime}
              />
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
