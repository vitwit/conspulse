"use client";
import React, { useEffect, useState, useCallback } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL;
const DUMP_CONSENSUS_URL = `${RPC_URL}/dump_consensus_state`;
const NET_INFO_URL = `${RPC_URL}/net_info`;

function CopyButton({ value, className = "" }: { value: string, className?: string }) {
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
        <svg width="16" height="16" fill="none" viewBox="0 0 20 20"><rect x="6" y="6" width="9" height="9" rx="2" stroke="#555" strokeWidth="1.5"/><rect x="3" y="3" width="9" height="9" rx="2" stroke="#bbb" strokeWidth="1.5"/></svg>
      </button>
      {copied && <span className="text-xs text-green-600">Copied!</span>}
    </span>
  );
}

function timeAgo(date: Date | null, now: number) {
  if (!date) return "";
  const diff = Math.floor((now - date.getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

// Render BitArray as vertical candles
function BitArrayCandles({ bitArray, validators }: { bitArray: string, validators?: any[] }) {
  // Extract the bit string from BA{21:xx_xxxxxxxxxxx_xxxxxx}
  const match = bitArray.match(/BA\{\d+:(.*?)\}/);
  const bits = match ? match[1] : null;
  if (!bits) return null;
  return (
    <div className="flex flex-row items-end gap-0.5" title="BitArray: green = voted, red = not voted">
      {bits.split("").map((b, i) => {
        const address = validators?.[i]?.address;
        return (
          <span
            key={i}
            title={address ? address : `Validator ${i}`}
            style={{ display: "inline-block" }}
            className="cursor-pointer"
          >
            <div
              className={
                b === "x"
                  ? "bg-green-500"
                  : "bg-red-400"
              }
              style={{ width: 6, height: 24, borderRadius: 2 }}
            />
          </span>
        );
      })}
    </div>
  );
}

export default function NetstatsPage() {
  const [dump, setDump] = useState<any>(null);
  const [netInfo, setNetInfo] = useState<any>(null);
  const [loadingDump, setLoadingDump] = useState(true);
  const [loadingNet, setLoadingNet] = useState(true);
  const [errorDump, setErrorDump] = useState<string | null>(null);
  const [errorNet, setErrorNet] = useState<string | null>(null);

  // For live-updating time.ago
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch dump_consensus_state every 10s
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

  // Fetch net_info every 100s
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
    const interval = setInterval(fetchDump, 10000);
    return () => clearInterval(interval);
  }, [fetchDump]);

  useEffect(() => {
    fetchNetInfo();
    const interval = setInterval(fetchNetInfo, 10000);
    return () => clearInterval(interval);
  }, [fetchNetInfo]);

  // Helper: match net_info peer to dump peer by id in node_address
  function getNetPeerForDumpPeer(dumpPeer: any) {
    if (!netInfo?.result?.peers) return null;
    return netInfo.result.peers.find((p: any) =>
      dumpPeer.node_address?.includes(p.node_info.id)
    );
  }

  // Summary values
  const roundState = dump?.result?.round_state;
  const peersDump = dump?.result?.peers || [];
  const height = roundState?.height || "—";
  const round = roundState?.round ?? "—";
  const step = roundState?.step ?? "—";
  const proposer = roundState?.validators?.proposer?.address || "—";
  const proposerObj = roundState?.validators?.validators?.find?.((v: any) => v.address === proposer);
  const nPeers = netInfo?.result?.n_peers || peersDump.length || "—";
  const lastBlockTime = roundState?.start_time ? new Date(roundState.start_time) : null;

  // Table: Peers
  const consensusHeight = Number(height);
  const peersTable = peersDump.map((peer: any) => {
    const netPeer = getNetPeerForDumpPeer(peer);
    const peerHeight = Number(peer.peer_state?.round_state?.height);
    let rowColor = "";
    if (!isNaN(peerHeight) && !isNaN(consensusHeight)) {
      if (peerHeight === consensusHeight) rowColor = "bg-green-100";
      else if (consensusHeight - peerHeight < 2) rowColor = "bg-yellow-100";
      else if (consensusHeight - peerHeight < 10) rowColor = "bg-pink-100";
      else rowColor = "bg-red-100";
    }
    // Last seen: peer_state.round_state.start_time from consensus data
    let lastSeen: string | null = null;
    const peerStartTime = peer.peer_state?.round_state?.start_time;
    if (peerStartTime) {
      const date = new Date(peerStartTime);
      if (!isNaN(date.getTime())) lastSeen = timeAgo(date, now);
    }
    return {
      node_address: peer.node_address,
      height: peer.peer_state?.round_state?.height,
      round: peer.peer_state?.round_state?.round,
      step: peer.peer_state?.round_state?.step,
      moniker: netPeer?.node_info?.moniker,
      id: netPeer?.node_info?.id,
      is_outbound: netPeer?.is_outbound,
      version: netPeer?.node_info?.version,
      network: netPeer?.node_info?.network,
      lastSeen,
      rowColor,
    };
  });

  // Table: Last Block Consensus
  const lastCommit = roundState?.last_commit;
  const lastCommitVotes = lastCommit?.votes || [];
  const lastCommitBitArray = lastCommit?.votes_bit_array || "";
  const validators = roundState?.validators?.validators || [];
  const totalVotingPower = validators.reduce((sum: number, v: any) => sum + Number(v.voting_power), 0);
  // Parse vote time from vote string (e.g., ... @ 2025-06-26T07:37:38.722318151Z})
  function parseVoteTime(vote: string) {
    const match = vote.match(/@ ([^}]+)}/);
    return match ? match[1] : null;
  }
  // Parse BitArray for last block votes %
  function parseBitArray(str: string) {
    // Example: BA{21:xx_xxxxxxxxxxxxxxxxxx} 170834774/190906937 = 0.89
    const match = str.match(/([\d]+)\/([\d]+)\s*=\s*([\d.]+)/);
    if (!match) return { percent: 0, voted: 0, total: 0 };
    return { percent: Math.round(Number(match[3]) * 100), voted: Number(match[1]), total: Number(match[2]) };
  }
  const lastBlockVotesInfo = parseBitArray(lastCommitBitArray);

  const [activeTab, setActiveTab] = useState<'peers' | 'consensus'>('peers');

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Banner */}
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
        <section className="p-4 sm:p-8 max-w-6xl mx-auto bg-white rounded-xl shadow-lg mb-8 mt-8">
          <h1 className="text-2xl font-bold mb-4 text-blue-800">Network Stats</h1>
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
              Peers
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
                    <th className="px-4 py-2 text-left">Moniker</th>
                    <th className="px-4 py-2 text-left">Node ID</th>
                    <th className="px-4 py-2 text-left">Height</th>
                    <th className="px-4 py-2 text-left">Round</th>
                    <th className="px-4 py-2 text-left">Step</th>
                    <th className="px-4 py-2 text-left">Last Seen</th>
                    <th className="px-4 py-2 text-left">Outbound?</th>
                    <th className="px-4 py-2 text-left">Version</th>
                    <th className="px-4 py-2 text-left">Network</th>
                  </tr>
                </thead>
                <tbody>
                  {peersTable.length === 0 && (
                    <tr><td colSpan={8} className="text-center py-4 text-gray-400">No peers found.</td></tr>
                  )}
                  {peersTable.map((peer: any, idx: number) => (
                    <tr key={peer.node_address || idx} className={`border-b last:border-b-0 ${peer.rowColor}`}>
                      <td className="px-4 py-2 font-mono">{peer.moniker || "—"}</td>
                      <td className="px-4 py-2 font-mono break-all">{peer.id || "—"}</td>
                      <td className="px-4 py-2 font-mono">{peer.height || "—"}</td>
                      <td className="px-4 py-2 font-mono">{peer.round ?? "—"}</td>
                      <td className="px-4 py-2 font-mono">{peer.step ?? "—"}</td>
                      <td className="px-4 py-2 font-mono">{peer.lastSeen || "—"}</td>
                      <td className="px-4 py-2 font-mono">{peer.is_outbound === undefined ? "—" : peer.is_outbound ? "Yes" : "No"}</td>
                      <td className="px-4 py-2 font-mono">{peer.version || "—"}</td>
                      <td className="px-4 py-2 font-mono">{peer.network || "—"}</td>
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