"use client";
import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import { NodeStats } from "./lib/api";

import dynamic from "next/dynamic";

import ShortName from "./components/ShortName";
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
import { formatLatency, timeAgo } from "./utils";
import { useWebSocket } from './context/WebsocketContext';
import { NetworkMessage, Stats } from "./types/ws";
import { SupportUS } from "./components/SupportUs";
import LastBlockConsensusTab from "./heartbeat/components/LastBlockConsensus";
import PeersTableTab from "./heartbeat/components/PeersTableTab";
import { useTendermint } from "./context/TendermintListener";
import { isEqual } from "lodash";

const rowVariants = {
  initial: { opacity: 0, y: -20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 20 },
};

const NodeMap = dynamic(() => import("./components/NodeMap"), {
  ssr: false,
});


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

  const [sortBy, setSortBy] = useState<string>('moniker');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const { networkStats, nodesStats, retries, error } = useWebSocket();

  const [height, setHeight] = useState<string>("");
  const [step, setStep] = useState<number>(0);
  const [round, setRound] = useState<number>(0);
  const [proposer, setProposer] = useState<string>("");
  const event = useTendermint();

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



  const handleSort = (key: string) => {
    if (sortBy === key) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(key);
      setSortDirection('asc');
    }
  };

  const sortedNodes = useMemo(() => {
    return [...nodes].sort((a, b) => {
      const aVal = a[sortBy as keyof NodeStats];
      const bVal = b[sortBy as keyof NodeStats];

      if (aVal == null) return 1;
      if (bVal == null) return -1;

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }

      return sortDirection === 'asc'
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
  }, [nodes, sortBy, sortDirection]);



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

  const prevNodesRef = useRef<Stats[]>([]);

  const [stats, setStats] = useState<NetworkMessage>();

  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const latestStatsRef = useRef<any>(null);
  const prevStatsNodesRef = useRef<any>(null);

  const DEBOUNCE_DELAY = 2000; // 2 seconds

  useEffect(() => {
    if (!nodesStats || !nodesStats.stats) return;

    latestStatsRef.current = nodesStats.stats;

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      const newStats = latestStatsRef.current;

      if (!equal(prevStatsNodesRef.current, newStats)) {
        prevStatsNodesRef.current = newStats;
        setNodes(newStats);
        setVersions(newStats.map((node: Stats) => node.version));
      }
    }, DEBOUNCE_DELAY);

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [nodesStats]);


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
  const lastBlockTime = roundState?.start_time
    ? new Date(roundState.start_time)
    : null;

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

  const nodesLocation = nodes.map((node: Stats) => {
    return {
      latitude: node.latitude,
      longitude: node.longitude,
      nodeName: node.country,
      radius: 5,
      fillKey: "success",
    };
  });

  const lastBlockVotesInfo = parseBitArray(lastCommitBitArray);

  const colorClasses: Record<string, string> = {
    cyan: "text-cyan-400",
    emerald: "text-emerald-400",
    violet: "text-violet-400",
    stone: "text-stone-400",
    blue: "text-blue-400",
    indigo: "text-indigo-400",
    lime: "text-lime-400",
    fuchsia: "text-fuchsia-400",
    pink: "text-pink-400",
    amber: "text-amber-400",
  };

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
      descirption: "The current round number within the consensus process for the latest block.",
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
      descirption: "The total number of active validators participating in block proposal and voting.",
      value: validators?.length ?? "—",
      icon: Shield,
      accent: "indigo",
    },
    {
      title: "Last Block",
      description: "The time elapsed since the most recently committed block.",
      value: lastBlockTime ? timeAgo(lastBlockTime, Date.now()) : "—",
      icon: Clock,
      accent: "lime",
    },
    {
      title: "Votes %",
      descirption: "The percentage of validators that signed the last block during the precommit stage.",
      value: lastBlockVotesInfo?.percent
        ? `${lastBlockVotesInfo.percent}%`
        : "—",
      icon: Vote,
      accent: "fuchsia",
    },
    {
      title: "Proposer",
      descirption: "The validator currently proposing the current block",
      value: ShortName({ value: proposer, maxLength: 6 }) || "—",
      icon: User,
      accent: "cyan",
    },
    {
      title: "Voting Power",
      descirption: "The voting power (stake) of the current block proposer",
      value: parseInt(proposerObj?.voting_power)?.toLocaleString() ?? "—",
      icon: Shield,
      accent: "amber",
    },
  ];

  const tabs: { key: "peers" | "consensus" | "versions"; label: string }[] = [
    { key: "peers", label: "Nodes" },
    { key: "versions", label: "Node Versions" },
    { key: "consensus", label: "Last Block Consensus" },
  ]



  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <SupportUS />

      <Navbar shrink={false} />
      <main className="flex-1 bg-[#0e1014]">
        <section className=" ml-4 mr-4 mt-2 mx-auto rounded-xl shadow-lg pb-8">
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

          <div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4 p-4 bg-[#0e1014] text-white font-sans">
              {metrics.map(({ title, value, icon: Icon, accent, descirption }) => (
                <div
                  key={title}
                  className="bg-[#1a1e24] rounded-lg px-5 py-4 border border-[#2a2f3a] hover:border-cyan-400 transition shadow-sm"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-md font-semibold text-teal-400 group-hover:text-white"
                      title={descirption}
                    >
                      {title}
                    </h3>
                    <Icon className={`w-6 h-6 ${colorClasses[accent]}`} />
                  </div>
                  <div
                    className={`text-3xl font-mono font-bold ${colorClasses[accent]} leading-tight truncate`}
                  // title={value}
                  >
                    {value}
                  </div>
                </div>
              ))}

              <div
                key="bit-array"
                className="bg-[#1a1e24] md:col-span-3 col-span-2 rounded-lg px-5 py-4 border border-[#2a2f3a] hover:border-cyan-400 transition shadow-sm"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-md font-semibold text-teal-400 group-hover:text-white">
                    Block Votes
                  </h3>
                  <User className={`w-6 h-6 text-lime-400`} />
                </div>
                <div
                  className={`text-3xl font-mono font-bold text-lime-400 leading-tight truncate`}
                  title="bit-array"
                >
                  {lastCommitBitArray && (
                    <BitArrayCandles
                      bitArray={lastCommitBitArray}
                      validators={validators}
                    />
                  )}
                </div>
              </div>


            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 gap-4 px-4 pb-4 bg-[#0e1014] text-white font-sans">
              <div className="bg-[#1a1e24] rounded-lg p-4 shadow-sm border border-[#2a2f3a]">
                <h3 className="text-sm font-semibold text-teal-400 mb-2">Block Propagation</h3>
                <BlockPropagationGraph data={stats?.blockPropagation} />
              </div>

              <div className="bg-[#1a1e24] rounded-lg p-4 shadow-sm border border-[#2a2f3a]">
                <h3 className="text-sm font-semibold text-teal-400 mb-2">Block Time</h3>
                <BarChart
                  data={stats?.blocksWindow?.map(stat => (stat.blockTime / 1000).toFixed(2)) || [0, 0, 0]}
                  labels={stats?.blocksWindow?.map(stat => stat.blockNumber) || [0, 0, 0]}
                  label="Block time"
                  color="#4C78A8"
                />
              </div>

              <div className="bg-[#1a1e24] rounded-lg p-4 shadow-sm border border-[#2a2f3a]">
                <h3 className="text-sm font-semibold text-teal-400 mb-2">Transactions</h3>
                <BarChart
                  data={stats?.blocksWindow?.map(stat => stat.txnCount) || [0, 0, 0]}
                  labels={stats?.blocksWindow?.map(stat => stat.blockNumber) || [0, 0, 0]}
                  label="Transactions"
                  color="#4C78A8"
                  showIntegersOnly={true}
                />
              </div>

              <div className="bg-[#1a1e24] rounded-lg p-4 shadow-sm border border-[#2a2f3a]">
                <h3 className="text-sm font-semibold text-teal-400 mb-2">Nodes Map</h3>
                <NodeMap data={nodesLocation} />
              </div>
            </div>

          </div>

          {/* Tabs for Peers and Last Block Consensus */}
          <div className="sticky top-0 z-10 bg-[#1a1e24] flex gap-2 border-b border-[#2a2f3a] px-4 py-2">
            {
              tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-4 py-2 text-sm font-semibold rounded-t-md transition-colors duration-200
        ${activeTab === tab.key
                      ? "bg-[#0e1014] text-cyan-400 border-b-2 border-cyan-400 hover:cursor-pointer "
                      : "bg-[#2a2f3a] text-gray-400 hover:text-white hover:bg-[#2f3542] hover:cursor-pointer"
                    }`}
                >
                  {tab.label}
                </button>
              ))}
          </div>

          {activeTab === "peers" && (
            <PeersTableTab
              nodes={nodes}
              sortedNodes={sortedNodes}
              sortBy={sortBy}
              sortDirection={sortDirection}
              handleSort={handleSort}
              formatLatency={formatLatency}
              rowVariants={rowVariants}
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
