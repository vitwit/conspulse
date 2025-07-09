"use client";
import React, { useEffect, useState, useCallback, useRef } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { getNodes, NodeStats } from "../lib/api";

import moment from 'moment';
import dynamic from 'next/dynamic';

import { AnimatePresence, motion } from "framer-motion";
import ShortName from "../components/ShortName";
import equal from "fast-deep-equal";
import NodeVersionsChart from "../components/NodeVersions";

const rowVariants = {
  initial: { opacity: 0, y: -20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 20 },
};


const NodeMap = dynamic(() => import('../components/NodeMap'), {
  ssr: false,
});

function formatLatency(ms: number): string {
  if (ms < 1000) {
    return `${ms.toLocaleString()}ms`;
  } else if (ms < 60000) {
    return `${(ms / 1000).toFixed(2)}s`;
  } else {
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(1);
    return `${minutes}m ${seconds}s`;
  }
}


function ErrorAlert({
  errors,
}: {
  errors: { label: string; message: string | null; onRetry?: () => void }[];
}) {
  const visibleErrors = errors.filter((e) => e.message);
  if (visibleErrors.length === 0) return null;

  return (
    <div className="mb-4 p-4 bg-red-100 border border-red-300 text-red-800 rounded">
      <p className="font-semibold mb-1">Error occurred while fetching data:</p>
      <ul className="list-disc list-inside text-sm">
        {visibleErrors.map((e, i) => (
          <li key={i}>
            {e.label}: {e.message}
            {e.onRetry && (
              <button
                onClick={e.onRetry}
                className="ml-2 text-blue-800 underline text-sm hover:text-blue-600"
              >
                Retry
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function LoadingNotice({ loadingItems }: { loadingItems: string[] }) {
  if (loadingItems.length === 0) return null;
  return (
    <div className="mb-4 p-4 bg-yellow-100 border border-yellow-300 text-yellow-800 rounded">
      <p className="font-semibold">Loading...</p>
      <p className="text-sm">{loadingItems.join(" and ")} in progress.</p>
    </div>
  );
}

function CopyButton({ value, className = "" }: { value: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <span className={"inline-flex items-center gap-1 " + className}>
      <button
        type="button"
        aria-label="Copy to clipboard"
        title={copied ? "Copied!" : "Copy"}
        onClick={() => {
          navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        }}
        className="ml-1 p-1 rounded hover:bg-gray-200 focus:outline-none"
        tabIndex={0}
      >
        <svg width="16" height="16" fill="none" viewBox="0 0 20 20">
          <rect x="6" y="6" width="9" height="9" rx="2" stroke="#555" strokeWidth="1.5" />
          <rect x="3" y="3" width="9" height="9" rx="2" stroke="#bbb" strokeWidth="1.5" />
        </svg>
      </button>
      {copied && <span className="text-xs text-green-600">Copied!</span>}
    </span>
  );
}

function BitArrayCandles({ bitArray, validators }: { bitArray: string; validators?: any[] }) {
  const match = bitArray.match(/BA\{\d+:(.*?)\}/);
  const bits = match ? match[1] : null;
  if (!bits) return null;
  return (
    <div className="flex flex-row items-end gap-0.5" title="BitArray: green = voted, red = not voted">
      {bits.split("").map((b, i) => {
        const address = validators?.[i]?.address;
        return (
          <span key={i} title={address ? address : `Validator ${i}`} className="cursor-pointer">
            <div
              className={b === "x" ? "bg-green-500" : "bg-red-400"}
              style={{ width: 6, height: 24, borderRadius: 2 }}
            />
          </span>
        );
      })}
    </div>
  );
}

function timeAgo(date: Date | null, now: number) {
  if (!date) return "—";
  const diff = Math.floor((now - date.getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

// === Main Page Component ===

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL;
const DUMP_CONSENSUS_URL = `${RPC_URL}/dump_consensus_state`;
const NET_INFO_URL = `${RPC_URL}/net_info`;

export default function NetstatsPage() {
  const [dump, setDump] = useState<any>(null);
  const [netInfo, setNetInfo] = useState<any>(null);
  const [loadingDump, setLoadingDump] = useState(true);
  const [loadingNet, setLoadingNet] = useState(true);
  const [errorDump, setErrorDump] = useState<string | null>(null);
  const [errorNet, setErrorNet] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [activeTab, setActiveTab] = useState<'peers' | 'consensus' | 'versions'>('peers');
  const [nodes, setNodes] = useState<NodeStats[]>([]);

  const [versions, setVersions] = useState<string[]>([]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchDump = useCallback(async () => {
    setLoadingDump(true);
    setErrorDump(null);
    try {
      const res = await fetch(DUMP_CONSENSUS_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setDump(data);
    } catch (err: any) {
      setErrorDump(err.message || "Unknown error");
      setDump(null);
    } finally {
      setLoadingDump(false);
    }
  }, []);

  const fetchNetInfo = useCallback(async () => {
    setLoadingNet(true);
    setErrorNet(null);
    try {
      const res = await fetch(NET_INFO_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setNetInfo(data);

    } catch (err: any) {
      setErrorNet(err.message || "Unknown error");
      setNetInfo(null);
    } finally {
      setLoadingNet(false);
    }
  }, []);


  const prevNodesRef = useRef<NodeStats[]>([]);

  const [stats, setStats] = useState();
  useEffect(() => {
    const fetchNodes = () => {
      getNodes()
        .then((newNodes) => {
          if (!equal(prevNodesRef.current, newNodes)) {
            setNodes(newNodes);
            prevNodesRef.current = newNodes;

            setVersions(newNodes.map((node: NodeStats) => {
              return node.version
            }));
          }
        })
        .catch(console.error);
    };

    fetchDump();
    fetchNodes();

    const interval = setInterval(fetchNodes, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchNetInfo();
    const interval = setInterval(fetchNetInfo, 10000);
    return () => clearInterval(interval);
  }, [fetchNetInfo]);

  useEffect(() => {
    if (activeTab === 'consensus') {
      fetchDump();
      const interval = setInterval(fetchDump, 10000);
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

  const roundState = dump?.result?.round_state;
  const height = roundState?.height || "—";
  const round = roundState?.round ?? "—";
  const step = roundState?.step ?? "—";
  const proposer = roundState?.validators?.proposer?.address || "—";
  const proposerObj = roundState?.validators?.validators?.find?.((v: any) => v.address === proposer);
  const lastBlockTime = roundState?.start_time ? new Date(roundState.start_time) : null;

  const lastCommit = roundState?.last_commit;
  const lastCommitVotes = lastCommit?.votes || [];
  const lastCommitBitArray = lastCommit?.votes_bit_array || "";
  const validators = roundState?.validators?.validators || [];
  const totalVotingPower = validators.reduce((sum: number, v: any) => sum + Number(v.voting_power), 0);
  const nPeers = netInfo?.result?.n_peers || "—";

  function parseVoteTime(vote: string) {
    const match = vote.match(/@ ([^}]+)}/);
    return match ? match[1] : null;
  }

  function parseBitArray(str: string) {
    const match = str.match(/([\d]+)\/([\d]+)\s*=\s*([\d.]+)/);
    if (!match) return { percent: 0, voted: 0, total: 0 };
    return {
      percent: Math.round(Number(match[3]) * 100),
      voted: Number(match[1]),
      total: Number(match[2]),
    };
  }

  const nodesLocation = nodes.map((node: NodeStats) => {
    return {
      latitude: node.latitude,
      longitude: node.longitude,
      nodeName: node.country,
      radius: 5,
      fillKey: 'success'

    }
  })



  const lastBlockVotesInfo = parseBitArray(lastCommitBitArray);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white text-center py-2 px-4 font-medium text-sm shadow-md">
        Support us by delegating to
        <a
          href="https://staking.polygon.technology/validators/50"
          target="_blank"
          rel="noopener noreferrer"
          className="underline font-semibold ml-1 hover:text-yellow-200"
        >
          Vitwit validator
        </a>
        🚀
      </div>
      <Navbar shrink={false} />
      <main className="flex-1">
        <section className="p-4 sm:p-8 ml-4 mr-4 mt-2 mx-auto bg-white rounded-xl shadow-lg mb-8">
          {/* <h1 className="text-2xl font-bold mb-4 text-blue-800">Network Stats</h1> */}

          {/* Modular Error and Loading Messages */}
          <ErrorAlert
            errors={[
              { label: "Consensus State", message: errorDump, onRetry: fetchDump },
              { label: "Network Info", message: errorNet, onRetry: fetchNetInfo },
            ]}
          />

          {/* <LoadingNotice
            loadingItems={[
              ...(loadingDump ? ["Consensus state"] : []),
              ...(loadingNet ? ["Network info"] : []),
            ]}
          /> */}

          {/* Summary Section */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
            {/* First row - 5 items */}
            <div className="flex flex-col items-center bg-blue-100 rounded-lg p-4 shadow-inner">
              <span className="text-gray-600">Latest Height</span>
              <span className="text-xl font-bold text-blue-900">{height}</span>
            </div>

            <div className="flex flex-col items-center bg-purple-100 rounded-lg p-4 shadow-inner">
              <span className="text-gray-600">Step</span>
              <span className="text-xl font-bold text-purple-900">{step}</span>
            </div>

            <div className="flex flex-col items-center bg-green-100 rounded-lg p-4 shadow-inner">
              <span className="text-gray-600">Round</span>
              <span className="text-xl font-bold text-green-900">{round}</span>
            </div>

            <div className="flex flex-col items-center bg-pink-100 rounded-lg p-4 shadow-inner">
              <span className="text-gray-600">Total Nodes</span>
              <span className="text-xl font-bold text-pink-900">{nPeers}</span>
            </div>

            <div className="flex flex-col items-center bg-gray-200 rounded-lg p-4 shadow-inner">
              <span className="text-gray-600">Active Validators</span>
              <span className="text-xl font-bold text-gray-900">{validators.length}</span>
            </div>
          </div>

          {/* Second Row - 2/3 content area + 1/3 map */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Left side (2/3) */}
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* First inner row */}
              <div className="flex flex-col items-center bg-gray-100 rounded-lg p-4 shadow-inner">
                <span className="text-gray-600">Last Block Time</span>
                <span className="text-base font-bold text-gray-900">
                  {lastBlockTime ? timeAgo(lastBlockTime, now) : "—"}
                </span>
              </div>

              <div className="flex flex-col items-center bg-orange-100 rounded-lg p-4 shadow-inner">
                <span className="text-gray-600">Last Block Votes %</span>
                <span className="text-xl font-bold text-orange-900">{lastBlockVotesInfo.percent}%</span>
                {/* <span className="text-xs text-gray-700">
        {lastBlockVotesInfo.voted}/{lastBlockVotesInfo.total}
      </span> */}
              </div>

              <div className="flex flex-col items-center bg-orange-100 rounded-lg p-4 shadow-inner">
                <span className="text-gray-600 mb-1">Last Block Votes</span>
                {lastCommitBitArray && <BitArrayCandles bitArray={lastCommitBitArray} validators={validators} />}
              </div>

              {/* Second inner row */}
              <div className="md:col-span-2 flex flex-col items-center bg-gray-100 rounded-lg p-4 shadow-inner">
                <span className="text-gray-600">Proposer</span>
                <span className="text-base font-bold text-gray-900 flex items-center gap-1">
                  {proposer || "—"}
                  {proposer && <CopyButton value={proposer} />}
                </span>
              </div>

              <div className="flex flex-col items-center bg-gray-100 rounded-lg p-4 shadow-inner">
                <span className="text-gray-600">Proposer Voting Power</span>
                <span className="text-base font-bold text-gray-900">
                  {proposerObj?.voting_power || "—"}
                </span>
              </div>
            </div>

            {/* Right side (1/3) */}
            <div className="flex flex-col bg-white rounded-lg p-4 shadow-inner">
              <span className="text-gray-600 mb-2">Node Map</span>
              <NodeMap data={nodesLocation} />
            </div>
          </div>


          {/* Tabs for Peers and Last Block Consensus */}
          <div className="sticky top-0 z-10 bg-white rounded-t-xl flex gap-2 border-b mb-4 mt-4">
            <button
              className={`px-4 py-2 font-semibold rounded-t-lg focus:outline-none transition-colors hover:cursor-pointer ${activeTab === 'peers' ? 'bg-blue-100 text-blue-800 border-b-2 border-blue-500' : 'bg-gray-100 text-gray-600'}`}
              onClick={() => setActiveTab('peers')}
            >
              Nodes
            </button>
            <button
              className={`px-4 py-2 font-semibold rounded-t-lg focus:outline-none transition-colors hover:cursor-pointer ${activeTab === 'versions' ? 'bg-blue-100 text-blue-800 border-b-2 border-blue-500' : 'bg-gray-100 text-gray-600'}`}
              onClick={() => setActiveTab('versions')}
            >
              Node Versions
            </button>
            <button
              className={`px-4 py-2 font-semibold rounded-t-lg focus:outline-none transition-colors hover:cursor-pointer ${activeTab === 'consensus' ? 'bg-blue-100 text-blue-800 border-b-2 border-blue-500' : 'bg-gray-100 text-gray-600'}`}
              onClick={() => setActiveTab('consensus')}
            >
              Last Block Consensus
            </button>
          </div>
          {activeTab === 'peers' && (
            <div className="overflow-x-auto mb-8">
              <table className="min-w-full text-xs bg-white rounded-lg shadow">
                {/* ✅ Static Table Headers */}
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2 text-left text-nowrap">Validator Address</th>
                    <th className="px-4 py-2 text-left text-nowrap">Moniker</th>
                    <th className="px-4 py-2 text-left text-nowrap">Node ID</th>
                    <th className="px-4 py-2 text-left text-nowrap">Earliest Height</th>
                    <th className="px-4 py-2 text-left text-nowrap">Latest Height</th>
                    <th className="px-4 py-2 text-left text-nowrap">Hash</th>
                    <th className="px-4 py-2 text-left text-nowrap">Block Time</th>
                    <th className="px-4 py-2 text-left text-nowrap">Caught Up</th>
                    <th className="px-4 py-2 text-left text-nowrap">Network</th>
                    <th className="px-4 py-2 text-left text-nowrap">Voting Power</th>
                    <th className="px-4 py-2 text-left text-nowrap">Peers</th>
                    <th className="px-4 py-2 text-left text-nowrap">Version</th>
                    <th className="px-4 py-2 text-left text-nowrap">OS</th>
                    <th className="px-4 py-2 text-left text-nowrap">Go Version</th>
                    <th className="px-4 py-2 text-left text-nowrap">Latency</th>
                  </tr>
                </thead>

                {/* ✅ Animated Body */}
                <tbody>
                  {nodes.length === 0 && (
                    <tr>
                      <td colSpan={15} className="text-center py-4 text-gray-400">
                        No data available.
                      </td>
                    </tr>
                  )}
                  <AnimatePresence>
                    {nodes.map((node: NodeStats, idx: number) => (
                      <motion.tr
                        key={node.address || idx}
                        layout
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        variants={rowVariants}
                        transition={{ duration: 0.3 }}
                        className={`border-b last:border-b-0`}
                      >
                        {[
                          <ShortName key={node.address} value={node.address} maxLength={9}/>,
                          node.moniker,
                          <ShortName key={node.nodeID} value={node.nodeID} maxLength={7}/>,
                          node.earliestBlockHeight,
                          node.latestBlockHeight,
                          <ShortName key={node.latestAppHash} value={node.latestAppHash} maxLength={7}/>,
                          moment(node.blockTime).fromNow() ?? "—",
                          node.isSyncing ? "Syncing" : "Yes",
                          node.network,
                          node.votingPower,
                          node.peers.length || 0,
                          node.version,
                          node.os,
                          node.goVersion,
                          formatLatency(node.latency),
                        ].map((value, i) => (
                          <td key={i} className="px-4 py-2 font-mono text-nowrap">
                            <motion.div
                              initial="initial"
                              animate="animate"
                              exit="exit"
                              variants={rowVariants}
                              transition={{ duration: 0.3 }}
                            >
                              {value || "—"}
                            </motion.div>
                          </td>
                        ))}
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>

            </div>
          )}
          {activeTab === 'versions' && (
            <NodeVersionsChart versions={versions} />
          )}
          {activeTab === 'consensus' && (
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs bg-white rounded-lg shadow">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2 text-left text-nowrap">#</th>
                    <th className="px-4 py-2 text-left text-nowrap">Validator Address</th>
                    <th className="px-4 py-2 text-left text-nowrap">Voted</th>
                    <th className="px-4 py-2 text-left text-nowrap">Vote Time</th>
                    <th className="px-4 py-2 text-left text-nowrap">Voting Power</th>
                    <th className="px-4 py-2 text-left text-nowrap">Voting Power %</th>
                    <th className="px-4 py-2 text-left text-nowrap">Vote String</th>
                  </tr>
                </thead>
                <tbody>
                  {validators.length === 0 && (
                    <tr><td colSpan={7} className="text-center py-4 text-gray-400">No validators found.</td></tr>
                  )}
                  {validators.map((v: any, idx: number) => {
                    const vote = lastCommitVotes[idx];
                    const voted = vote && typeof vote === 'string' && !vote.startsWith('nil');
                    const voteTimeStr = voted ? parseVoteTime(vote) : null;
                    const voteTime = voteTimeStr ? new Date(voteTimeStr) : null;
                    const votingPower = Number(v.voting_power);
                    const votingPowerPercent = totalVotingPower ? ((votingPower / totalVotingPower) * 100).toFixed(2) : "0.00";
                    return (
                      <tr key={v.address} className={voted ? "bg-green-50" : "bg-red-50"}>
                        <td className="px-4 py-2 font-mono">{idx}</td>
                        <td className="px-4 py-2 font-mono break-all">{ShortName({value: v.address, maxLength: 19})}</td>
                        <td className="px-4 py-2 font-mono">{voted ? "✅" : "❌"}</td>
                        <td className="px-4 py-2 font-mono">{voteTime ? timeAgo(voteTime, now) : "—"}</td>
                        <td className="px-4 py-2 font-mono">{votingPower}</td>
                        <td className="px-4 py-2 font-mono">{votingPowerPercent}%</td>
                        <td className="px-4 py-2 font-mono break-all">{vote || "—"}</td>
                      </tr>
                    );
                  })}
                  {lastCommitBitArray && (
                    <tr>
                      <td className="px-4 py-2 font-mono font-bold">BitArray</td>
                      <td className="px-4 py-2 font-mono break-all" colSpan={6}>{lastCommitBitArray}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

        </section>
      </main>
      <Footer />
    </div>
  );
}
