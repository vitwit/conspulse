"use client";
import React, { useEffect, useState, useCallback } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { getNodes, NodeStats } from "../lib/api";

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
  const [activeTab, setActiveTab] = useState<'peers' | 'consensus'>('peers');
  const [nodes, setNodes] = useState<NodeStats[]>([]);

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

  useEffect(() => {
    fetchDump();
    const fetchNodes = () => {
      getNodes()
        .then(setNodes)
        .catch(console.error);
    };
    fetchNodes();
    const nodeInterval = setInterval(fetchNodes, 10000);
    return () => clearInterval(nodeInterval);
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
      <Navbar />
      <main className="flex-1">
        <section className="p-4 sm:p-8 ml-4 mr-4 mx-auto bg-white rounded-xl shadow-lg mb-8">
          <h1 className="text-2xl font-bold mb-4 text-blue-800">Network Stats</h1>

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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="flex flex-col items-center bg-blue-100 rounded-lg p-4 shadow-inner">
              <span className="text-gray-600">Latest Height</span>
              <span className="text-xl font-bold text-blue-900">{height}</span>
            </div>
            <div className="flex flex-col items-center bg-green-100 rounded-lg p-4 shadow-inner">
              <span className="text-gray-600">Round</span>
              <span className="text-xl font-bold text-green-900">{round}</span>
            </div>
            <div className="flex flex-col items-center bg-purple-100 rounded-lg p-4 shadow-inner">
              <span className="text-gray-600">Step</span>
              <span className="text-xl font-bold text-purple-900">{step}</span>
            </div>
            <div className="flex flex-col items-center bg-pink-100 rounded-lg p-4 shadow-inner">
              <span className="text-gray-600">Peers</span>
              <span className="text-xl font-bold text-pink-900">{nPeers}</span>
            </div>
            <div className="flex flex-col items-center bg-gray-100 rounded-lg p-4 shadow-inner">
              <span className="text-gray-600">Last Block Time</span>
              <span className="text-base font-bold text-gray-900">{lastBlockTime ? timeAgo(lastBlockTime, now) : "—"}</span>
            </div>
            <div className="flex flex-col items-center bg-orange-100 rounded-lg p-4 shadow-inner">
              <span className="text-gray-600">Last Block Votes %</span>
              <span className="text-xl font-bold text-orange-900">{lastBlockVotesInfo.percent}%</span>
              <span className="text-xs text-gray-700">{lastBlockVotesInfo.voted}/{lastBlockVotesInfo.total}</span>
            </div>
            <div className="flex flex-col items-center bg-gray-200 rounded-lg p-4 shadow-inner">
              <span className="text-gray-600">Validators</span>
              <span className="text-xl font-bold text-gray-900">{validators.length}</span>
            </div>
            <div className="flex flex-col items-center bg-gray-100 rounded-lg p-4 shadow-inner col-span-2">
              <span className="text-gray-600">Proposer</span>
              <span className="text-base font-bold text-gray-900 flex items-center gap-1">
                {proposer || "—"}
                {proposer && <CopyButton value={proposer} />}
              </span>
            </div>
            <div className="flex flex-col items-center bg-gray-100 rounded-lg p-4 shadow-inner">
              <span className="text-gray-600">Proposer Voting Power</span>
              <span className="text-base font-bold text-gray-900">{proposerObj?.voting_power || "—"}</span>
            </div>
            {lastCommitBitArray && (
              <div className="flex flex-col items-center bg-gray-50 rounded-lg p-4 shadow-inner">
                <span className="text-gray-600 mb-1">Last Block Votes</span>
                <BitArrayCandles bitArray={lastCommitBitArray} validators={validators} />
              </div>
            )}
          </div>

          {/* Tabs for Peers and Last Block Consensus */}
          <div className="sticky top-0 z-10 bg-white rounded-t-xl flex gap-2 border-b mb-4">
            <button
              className={`px-4 py-2 font-semibold rounded-t-lg focus:outline-none transition-colors ${activeTab === 'peers' ? 'bg-blue-100 text-blue-800 border-b-2 border-blue-500' : 'bg-gray-100 text-gray-600'}`}
              onClick={() => setActiveTab('peers')}
            >
              Nodes
            </button>
            <button
              className={`px-4 py-2 font-semibold rounded-t-lg focus:outline-none transition-colors ${activeTab === 'consensus' ? 'bg-blue-100 text-blue-800 border-b-2 border-blue-500' : 'bg-gray-100 text-gray-600'}`}
              onClick={() => setActiveTab('consensus')}
            >
              Last Block Consensus
            </button>
          </div>
          {activeTab === 'peers' && (
            <div className="overflow-x-auto mb-8">
              <table className="min-w-full text-xs bg-white rounded-lg shadow">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2 text-left">Address</th>
                    <th className="px-4 py-2 text-left">Moniker</th>
                    <th className="px-4 py-2 text-left">Node ID</th>
                    <th className="px-4 py-2 text-left">Earliest Height</th>
                    <th className="px-4 py-2 text-left">Latest Height</th>
                    <th className="px-4 py-2 text-left">Block Time</th>
                    <th className="px-4 py-2 text-left">Syncing</th>
                    <th className="px-4 py-2 text-left">Network</th>
                    <th className="px-4 py-2 text-left">Voting Power</th>
                    <th className="px-4 py-2 text-left">Peers</th>
                    <th className="px-4 py-2 text-left">Version</th>
                    <th className="px-4 py-2 text-left">OS</th>
                    <th className="px-4 py-2 text-left">Go Version</th>
                  </tr>
                </thead>
                <tbody>
                  {nodes.length === 0 && (
                    <tr><td colSpan={8} className="text-center py-4 text-gray-400">No data available.</td></tr>
                  )}
                  {nodes.map((node: any, idx: number) => (
                    <tr key={node.address || idx} className={`border-b last:border-b-0 ${node.rowColor}`}>
                      <td className="px-4 py-2 font-mono">{node.address || "—"}</td>
                      <td className="px-4 py-2 font-mono">{node.moniker || "—"}</td>
                      <td className="px-4 py-2 font-mono break-all">{node.nodeID || "—"}</td>
                      <td className="px-4 py-2 font-mono">{node.earliestBlockHeight || "—"}</td>
                      <td className="px-4 py-2 font-mono">{node.latestBlockHeight || "—"}</td>
                      <td className="px-4 py-2 font-mono">{node.blockTime ?? "—"}</td>
                      <td className="px-4 py-2 font-mono">{node?.isSyncing ? "Yes" : "No"}</td>
                      <td className="px-4 py-2 font-mono">{node.network || "—"}</td>
                      <td className="px-4 py-2 font-mono">{node.votingPower || "—"}</td>
                      <td className="px-4 py-2 font-mono">{node.peers.length || 0}</td>
                      <td className="px-4 py-2 font-mono">{node.version}</td>
                      <td className="px-4 py-2 font-mono">{node.os}</td>
                      <td className="px-4 py-2 font-mono">{node.goVersion}</td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {activeTab === 'consensus' && (
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs bg-white rounded-lg shadow">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2 text-left">#</th>
                    <th className="px-4 py-2 text-left">Validator Address</th>
                    <th className="px-4 py-2 text-left">Voted</th>
                    <th className="px-4 py-2 text-left">Vote Time</th>
                    <th className="px-4 py-2 text-left">Voting Power</th>
                    <th className="px-4 py-2 text-left">Voting Power %</th>
                    <th className="px-4 py-2 text-left">Vote String</th>
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
                        <td className="px-4 py-2 font-mono break-all">{v.address}</td>
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
