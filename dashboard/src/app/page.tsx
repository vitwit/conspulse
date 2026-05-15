"use client";

import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import throttle from "lodash/throttle";
import clsx from "clsx";

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
} from "lucide-react";
import { BlockPropagationGraph } from "./heartbeat/components/BlockPropagationGraph";
import BarChart from "./heartbeat/components/Barchart";
import { BitArrayCandles } from "./heartbeat/components/BitArrayCandles";
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


const rowVariants = {
  initial: { opacity: 0, y: -20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 20 },
};

const NodeMap = dynamic(() => import("./components/NodeMap"), {
  ssr: false,
});


const colorClasses: Record<string, string> = {
  cyan:    "text-[#39c5cf]",
  emerald: "text-[#3fb950]",
  violet:  "text-[#bc8cff]",
  stone:   "text-[#8b949e]",
  blue:    "text-[#58a6ff]",
  indigo:  "text-[#79c0ff]",
  lime:    "text-[#7ee787]",
  fuchsia: "text-[#e879f9]",
  pink:    "text-[#f472b6]",
  amber:   "text-[#e3b341]",
};

const iconBgClasses: Record<string, string> = {
  cyan:    "bg-[#39c5cf]/10",
  emerald: "bg-[#3fb950]/10",
  violet:  "bg-[#bc8cff]/10",
  stone:   "bg-[#8b949e]/10",
  blue:    "bg-[#58a6ff]/10",
  indigo:  "bg-[#79c0ff]/10",
  lime:    "bg-[#7ee787]/10",
  fuchsia: "bg-[#e879f9]/10",
  pink:    "bg-[#f472b6]/10",
  amber:   "bg-[#e3b341]/10",
};


const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL;
const DUMP_CONSENSUS_URL = `${RPC_URL}/dump_consensus_state`;
const NET_INFO_URL = `${RPC_URL}/net_info`;

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

  const [sortBy, setSortBy] = useState<string>("moniker");

  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>("asc");


  const { networkStats, nodesStats, retries, error } = useWebSocket();

  const [height, setHeight] = useState<string>("");
  const [step, setStep] = useState<number>(0);
  const [round, setRound] = useState<number>(0);
  const [proposer, setProposer] = useState<string>("");
  const event = useTendermint();

  const [lastBlockTime, setLastBlockTime] = useState(new Date())
  useEffect(() => {
    if (!event) return;

    const timeout = setTimeout(() => {
      if (event.height) {
        const heightNum = Number(event.height);
        const formattedHeight = !isNaN(heightNum)
          ? heightNum.toLocaleString()
          : String(event.height);
        if (formattedHeight !== height && formattedHeight > height) {
          setHeight(formattedHeight);
          setLastBlockTime(new Date());
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
    }

    const stored1 = localStorage.getItem(SORT_DIRECTION_KEY);
    if (stored1 && (stored1 === "asc" || stored1 === "desc")) {
      setSortDirection(stored1);
    }
  }, [])



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
      setSortDirection('asc');

      localStorage.setItem(SORT_BY_KEY, normalizedKey);
      localStorage.setItem(SORT_DIRECTION_KEY, 'asc');
    }
  };

  useEffect(() => {
    localStorage.setItem(SORT_BY_KEY, sortBy);
  }, [sortBy]);

  useEffect(() => {
    localStorage.setItem(SORT_DIRECTION_KEY, sortDirection);
  }, [sortDirection]);

  const [favoriteNodes, setFavoriteNodes] = useState<Set<string>>(new Set());
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


  const sortedNodes = useMemo(() => {
    return [...nodes]
      .sort((a, b) => {
        // Favorited nodes come first
        const aFav = favoriteNodes.has(a.address);
        const bFav = favoriteNodes.has(b.address);
        if (aFav !== bFav) return aFav ? -1 : 1;

        const aVal = a[sortBy as keyof Stats];
        const bVal = b[sortBy as keyof Stats];

        return sortDirection === 'asc'
          ? String(aVal).localeCompare(String(bVal))
          : String(bVal).localeCompare(String(aVal));
      });
  }, [nodes, sortBy, sortDirection, favoriteNodes]);



  const [updatedRows, setUpdatedRows] = useState<Set<string>>(new Set());
  const previousNodesRef = useRef<Stats[]>([]);

  useEffect(() => {
    const updated = new Set<string>();

    nodes.forEach((node) => {
      const previous = previousNodesRef.current.find((n) => n.address === node.address);
      if (previous && JSON.stringify(previous) !== JSON.stringify(node)) {
        updated.add(node.address);
      }
    });

    if (updated.size > 0) {
      setUpdatedRows((prev) => new Set([...prev, ...updated]));

      // Remove highlights after 2 second
      setTimeout(() => {
        setUpdatedRows((prev) => {
          const copy = new Set(prev);
          updated.forEach((id) => copy.delete(id));
          return copy;
        });
      }, 2_000);
    }

    previousNodesRef.current = nodes;
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


  const [stats, setStats] = useState<NetworkMessage>();


  const UPDATE_INTERVAL = 2000;

  const prevStatsRef = useRef<any>(null);

  // one stable throttled function for the life of the component
  const applyStats = useRef(
    throttle((stats: Stats[]) => {
      if (!equal(prevStatsRef.current, stats)) {
        prevStatsRef.current = stats;
        setNodes(stats);
        setVersions(stats.map(s => s.version));
      }
    }, UPDATE_INTERVAL, { leading: true, trailing: true })
  ).current;

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
  }, []);

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

  if (!RPC_URL) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-600 text-lg font-bold">
        Error: Missing NEXT_PUBLIC_RPC_URL in environment variables.
      </div>
    );
  }



  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!isEqual(stats, networkStats)) {
        setStats(networkStats);
      }
    }, 100);

    return () => clearTimeout(timeout);
  }, [networkStats, stats]);


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

  function parseBitArray(str: string) {
    const match = str.match(/([\d]+)\/([\d]+)\s*=\s*([\d.]+)/);
    if (!match) return { percent: 0, voted: 0, total: 0 };
    return {
      percent: Math.round(Number(match[3]) * 100),
      voted: Number(match[1]),
      total: Number(match[2]),
    };
  }

  const prevNodesRef = useRef<Stats[] | null>(null);

  const nodesLocation = useMemo(() => {
    if (prevNodesRef.current && equal(prevNodesRef.current, nodes)) {
      return prevNodesRef.current.map((node: Stats) => ({
        latitude: node.latitude,
        longitude: node.longitude,
        nodeName: node.country,
        radius: 5,
        fillKey: "success",
      }));
    }

    // Update previous nodes for next render
    prevNodesRef.current = nodes;

    return nodes.map((node: Stats) => ({
      latitude: node.latitude,
      longitude: node.longitude,
      nodeName: node.country,
      radius: 5,
      fillKey: "success",
    }));
  }, [nodes]);

  const lastBlockVotesInfo = parseBitArray(lastCommitBitArray);


  const metrics = [
    {
      title: "Latest Height",
      description: "The current block height of the blockchain, representing the total number of blocks.",
      value: `#${height}`,
      icon: Layers,
      accent: "blue",
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
      accent: "blue",
    },
    {
      title: "Validators",
      description: "The total number of active validators participating in block proposal and voting.",
      value: validators?.length ?? "—",
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
      value: ShortProposerName({ value: proposer, maxLength: 6 }) || "—",
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

  const tabs: { key: "peers" | "consensus" | "versions"; label: string }[] = [
    { key: "peers", label: "Nodes" },
    { key: "versions", label: "Node Versions" },
    { key: "consensus", label: "Last Block Consensus" },
  ]

  const [visible, setVisible] = useState(true);

  const toggleVisibility = () => setVisible((prev) => !prev);



  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg-primary)" }}>
      <SupportUS />

      <Navbar shrink={false} />
      <main className="flex-1">
        <section className="px-4 sm:px-6 pt-4 pb-8 max-w-[1400px] mx-auto">
          {/* Errors */}
          <ErrorAlert
            errors={[
              { label: "Consensus State", message: errorDump, onRetry: fetchDump },
              { label: "Network Info",    message: errorNet,  onRetry: fetchNetInfo },
            ]}
          />

          {/* Toggle Content */}
          <div
            id="x"
            className={clsx(
              "transition-all duration-500 overflow-hidden",
              visible ? "max-h-[1200px] opacity-100" : "max-h-0 opacity-0"
            )}
          >
            {/* ── Metric Cards ── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3 py-4">
              {metrics.map(({ title, value, icon: Icon, accent, description }) => (
                <div
                  key={title}
                  className="e-card px-4 py-4 group cursor-default"
                >
                  <div className="flex items-center justify-between mb-3">
                    <DescriptionTooltip title={title} description={description || "-"} />
                    <div className={`w-7 h-7 rounded-md flex items-center justify-center ${iconBgClasses[accent]} transition-colors`}>
                      <Icon className={`w-3.5 h-3.5 ${colorClasses[accent]}`} />
                    </div>
                  </div>
                  <div className={`text-2xl font-mono font-bold ${colorClasses[accent]} leading-tight truncate`}>
                    {value}
                  </div>
                </div>
              ))}

              {/* Block Votes (wide card) */}
              <div className="e-card md:col-span-4 col-span-2 px-4 py-4">
                <div className="flex items-center justify-between mb-3">
                  <DescriptionTooltip
                    title="Block Votes"
                    description="Votes cast by validators for the current block."
                  />
                  <div className="w-7 h-7 rounded-md flex items-center justify-center bg-[#7ee787]/10">
                    <User className="w-3.5 h-3.5 text-[#7ee787]" />
                  </div>
                </div>
                <div className="text-2xl font-mono font-bold text-[#7ee787] leading-tight truncate">
                  {lastCommitBitArray && (
                    <BitArrayCandles
                      bitArray={lastCommitBitArray}
                      validators={validators}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* ── Charts Row ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
              <div className="e-card p-4">
                <div className="mb-3">
                  <DescriptionTooltip
                    description="Distribution of block receive times after proposal."
                    title="Block Propagation"
                  />
                </div>
                <BlockPropagationGraph data={stats?.blockPropagation} />
              </div>

              <div className="e-card p-4">
                <div className="mb-3">
                  <DescriptionTooltip
                    title="Block Time"
                    description="Time taken to produce each block at every height."
                  />
                </div>
                <BarChart
                  data={stats?.blocksWindow?.map(stat => (stat.blockTime / 1000).toFixed(2)) || [0, 0, 0]}
                  labels={stats?.blocksWindow?.map(stat => stat.blockNumber) || [0, 0, 0]}
                  label="Block time"
                  color="#3fb950cc"
                />
              </div>

              <div className="e-card p-4">
                <div className="mb-3">
                  <DescriptionTooltip
                    title="Transactions"
                    description="Number of transactions included in each block."
                  />
                </div>
                <BarChart
                  data={stats?.blocksWindow?.map(stat => stat.txnCount) || [0, 0, 0]}
                  labels={stats?.blocksWindow?.map(stat => stat.blockNumber) || [0, 0, 0]}
                  label="Transactions"
                  color="#58a6ffcc"
                  showIntegersOnly={true}
                />
              </div>

              <div className="e-card p-4">
                <div className="mb-3">
                  <DescriptionTooltip
                    title="Nodes Map"
                    description="Geographical distribution of network nodes."
                  />
                </div>
                <NodeMap data={nodesLocation} />
              </div>
            </div>
          </div>

          {/* ── Tabs ── */}
          <div
            className="sticky top-16 z-10 mt-5 border-b"
            style={{ background: "var(--bg-surface)", borderColor: "var(--border-default)" }}
          >
            <div className="flex gap-0">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className="relative px-5 py-3 text-sm font-medium transition-all duration-200 cursor-pointer border-b-2 -mb-px"
                  style={{
                    color: activeTab === tab.key ? "var(--text-primary)" : "var(--text-secondary)",
                    borderBottomColor: activeTab === tab.key ? "var(--accent-blue)" : "transparent",
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Tab Content ── */}
          {activeTab === "peers" && (
            <PeersTableTab
              nodes={nodes}
              sortedNodes={sortedNodes}
              sortBy={sortBy}
              sortDirection={sortDirection}
              handleSort={handleSort}
              rowVariants={rowVariants}
              updatedRows={updatedRows}
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
        </section>
      </main>
      <Footer />
    </div>
  );
}
