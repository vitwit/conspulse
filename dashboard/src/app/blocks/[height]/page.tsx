"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import { 
  ChevronLeft, ChevronRight, Clock, Database, Hash, 
  Layers, User, Zap, CheckCircle2, Info, Shield, Activity,
} from "lucide-react";
import moment from "moment";
import ShortName from "../../components/ShortName";
import JsonViewer from "../../components/JsonViewer";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

type Tab =  "side_tx" | "transactions" | "events" | "json";

export default function BlockDetailPage() {
  const { height } = useParams();
  const router = useRouter();
  const [block, setBlock] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [sideTx, setSideTx] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [txLoading, setTxLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("side_tx");

  useEffect(() => {
    if (!height) return;

    async function fetchAll() {
      setLoading(true);
      setError(null);

      try {
        // Fetch block, transactions, and side tx in parallel
        const [blockRes, txRes, sideTxRes] = await Promise.all([
          fetch(`${API_URL}/blocks/${height}`),
          fetch(`${API_URL}/txs?height=${height}`),
          fetch(`${API_URL}/sideTx/${height}`),
        ]);

        if (!blockRes.ok) throw new Error(`HTTP ${blockRes.status}`);

        const [blockData, txData, sideTxData] = await Promise.all([
          blockRes.json(),
          txRes.ok ? txRes.json() : Promise.resolve({ txs: [] }),
          sideTxRes.ok ? sideTxRes.json() : Promise.resolve(null),
        ]);

        setBlock(blockData.block);
        setTransactions(txData.txs || []);
        setSideTx(sideTxData);
      } catch (err: any) {
        setError(err.message || "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    fetchAll();
  }, [height]);

  const goToBlock = (h: number) => router.push(`/blocks/${h}`);

  const blockData = useMemo(() => {
    if (!block) return null;
    const finalizeBlock = block.result_finalize_block || {};
    return {
      ...block,
      block_tx: finalizeBlock.block_tx || null,
      consensus_param_updates: finalizeBlock.consensus_param_updates || null,
      validator_updates: finalizeBlock.validator_updates || null,
    };
  }, [block]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0e1014] flex flex-col">
        <Navbar shrink={false} />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-green-500/20 border-t-green-500 rounded-full animate-spin" />
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !blockData) {
    return (
      <div className="min-h-screen bg-[#0e1014] flex flex-col">
        <Navbar shrink={false} />
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <Info size={48} className="text-red-500" />
          <h2 className="text-2xl font-bold text-white">Block Not Found</h2>
          <p className="text-gray-400">{error || "The requested block could not be retrieved."}</p>
          <button
            onClick={() => router.push("/blocks")}
            className="mt-4 px-6 py-2 bg-[#2a2f3a] text-white rounded-lg hover:bg-[#343a47] transition-colors"
          >
            Back to Blocks
          </button>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0e1014] flex flex-col font-sans">
      <Navbar shrink={false} />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
        {/* Breadcrumb & Navigation */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">Explorer</span>
            <span className="text-gray-700">/</span>
            <span className="text-gray-500 cursor-pointer hover:text-gray-300" onClick={() => router.push("/blocks")}>
              Blocks
            </span>
            <span className="text-gray-700">/</span>
            <span className="text-white font-mono text-xs">{blockData.height}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => goToBlock(blockData.height - 1)}
              className="p-2 bg-[#1a1e24] border border-[#2a2f3a] rounded-lg text-gray-400 hover:text-white hover:bg-[#2a2f3a] transition-all"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => goToBlock(blockData.height + 1)}
              className="p-2 bg-[#1a1e24] border border-[#2a2f3a] rounded-lg text-gray-400 hover:text-white hover:bg-[#2a2f3a] transition-all"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* Block Info Card */}
        <div className="bg-[#1a1e24] rounded-xl border border-[#2a2f3a] mb-8 overflow-hidden">
          <div className="px-6 py-4 border-b border-[#2a2f3a] bg-[#1d2127]">
            <h2 className="text-sm font-bold text-gray-300 uppercase tracking-widest flex items-center gap-2">
              <Layers size={15} /> Block Information
            </h2>
          </div>

          <div className="divide-y divide-[#2a2f3a]">
            <InfoRow label="Chain ID">
              <span className="text-gray-200">{blockData.chain_id}</span>
            </InfoRow>
            <InfoRow label="Height">
              <span className="text-green-400 font-mono">{blockData.height?.toLocaleString()}</span>
            </InfoRow>
            <InfoRow label="Time">
              <span className="text-gray-200">
                {moment(blockData.time).format("YYYY-MM-DD[T]HH:mm:ss[Z]")}
                <span className="text-gray-500 ml-2">({moment(blockData.time).fromNow()})</span>
              </span>
            </InfoRow>
            <InfoRow label="Block Hash">
              <span className="text-gray-200 font-mono text-xs break-all">{blockData.data_hash}</span>
            </InfoRow>
            <InfoRow label="App Hash">
              <span className="text-gray-200 font-mono text-xs break-all">{blockData.app_hash}</span>
            </InfoRow>
            <InfoRow label="Proposer">
              <span className="text-blue-400 font-mono text-xs break-all">{blockData.proposer_address}</span>
            </InfoRow>
            <InfoRow label="TX Count">
              <span className="text-gray-200 font-mono">{blockData.transactions}</span>
            </InfoRow>
          </div>

          {blockData.block_tx && (
            <div className="px-6 py-4 border-t border-blue-900/30 bg-blue-500/5">
              <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-1 flex items-center gap-2">
                <CheckCircle2 size={13} /> Heimdall Sidechain TX
              </p>
              <p className="text-blue-200 font-mono text-xs break-all">{blockData.block_tx}</p>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="border-b border-[#2a2f3a] flex gap-6">
          <TabItem label="Side Txs" active={activeTab === "side_tx"} onClick={() => setActiveTab("side_tx")} />
          <TabItem label="Other Transactions" count={transactions.length} active={activeTab === "transactions"} onClick={() => setActiveTab("transactions")} />
          {/* <TabItem label="Protocol" count={(blockData.consensus_param_updates ? 1 : 0) + (blockData.validator_updates?.length || 0)} active={activeTab === "protocol"} onClick={() => setActiveTab("protocol")} /> */}
          <TabItem label="Block Events" active={activeTab === "events"} onClick={() => setActiveTab("events")} />
          <TabItem label="Raw JSON" active={activeTab === "json"} onClick={() => setActiveTab("json")} />
        </div>

        {/* Tab Content */}
        <div className="py-6 min-h-[400px]">
          {/* Transactions */}
          {activeTab === "transactions" && (
            <div className="bg-[#1a1e24] rounded-lg border border-[#2a2f3a] overflow-hidden">
              {txLoading ? (
                <div className="py-20 flex justify-center">
                  <div className="w-8 h-8 border-2 border-green-500/20 border-t-green-500 rounded-full animate-spin" />
                </div>
              ) : transactions.length === 0 ? (
                <div className="py-20 text-center text-gray-500 italic font-mono text-sm">
                  No transactions found at this height.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs text-left">
                    <thead className="bg-[#21262d] text-zinc-500 uppercase tracking-wider font-semibold">
                      <tr>
                        <th className="px-6 py-4">TX Hash</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Messages</th>
                        <th className="px-6 py-4">Memo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2a2f3a]">
                      {transactions.map((tx: any, idx: number) => (
                        <tr
                          key={idx}
                          className="hover:bg-white/5 transition-colors cursor-pointer"
                          onClick={() => router.push(`/tx/${tx.txhash || tx.hash}`)}
                        >
                          <td className="px-6 py-4">
                            <span className="text-blue-400 font-mono">
                              <ShortName value={tx.txhash || tx.hash} maxLength={20} />
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              tx.raw_log?.toLowerCase().includes("error")
                                ? "bg-red-500/20 text-red-400"
                                : "bg-green-500/20 text-green-400"
                            }`}>
                              {tx.raw_log?.toLowerCase().includes("error") ? "FAILED" : "SUCCESS"}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-1">
                              {(tx.messages || []).map((msg: any, mIdx: number) => (
                                <span key={mIdx} className="bg-[#2a2f3a] px-2 py-0.5 rounded text-[10px] text-gray-300">
                                  {msg.typeUrl?.split(".").pop() || "Unknown"}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-gray-500 truncate max-w-[200px]">
                            {tx.memo || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Protocol */}
          {/* {activeTab === "protocol" && (
            <div className="space-y-6">
              <div className="bg-[#1a1e24] rounded-lg border border-[#2a2f3a] overflow-hidden">
                <div className="bg-[#21262d] px-6 py-4 border-b border-[#2a2f3a]">
                  <h3 className="text-xs font-bold text-blue-400 uppercase tracking-widest flex items-center gap-2">
                    <Shield size={14} /> Consensus Parameter Updates
                  </h3>
                </div>
                <div className="p-6">
                  {blockData.consensus_param_updates
                    ? <JsonViewer data={blockData.consensus_param_updates} initialExpanded={true} />
                    : <p className="text-gray-600 italic text-sm">No consensus parameter updates at this height.</p>
                  }
                </div>
              </div>

              <div className="bg-[#1a1e24] rounded-lg border border-[#2a2f3a] overflow-hidden">
                <div className="bg-[#21262d] px-6 py-4 border-b border-[#2a2f3a]">
                  <h3 className="text-xs font-bold text-purple-400 uppercase tracking-widest flex items-center gap-2">
                    <Activity size={14} /> Validator Set Updates
                  </h3>
                </div>
                <div className="p-6">
                  {blockData.validator_updates?.length > 0 ? (
                    <table className="min-w-full text-xs text-left">
                      <thead className="text-zinc-500 uppercase font-semibold">
                        <tr>
                          <th className="pb-4 pr-6">Validator Address</th>
                          <th className="pb-4 px-6">Pubkey Type</th>
                          <th className="pb-4 pl-6 text-right">Voting Power</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#2a2f3a]">
                        {blockData.validator_updates.map((v: any, idx: number) => (
                          <tr key={idx}>
                            <td className="py-4 pr-6 font-mono text-gray-300">
                              <ShortName value={v.address || ""} maxLength={40} />
                            </td>
                            <td className="py-4 px-6 font-mono text-gray-500 italic">
                              {v.pub_key?.type || "ed25519"}
                            </td>
                            <td className="py-4 pl-6 text-right font-bold text-green-400">
                              {v.power || 0}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-gray-600 italic text-sm">No validator set changes at this height.</p>
                  )}
                </div>
              </div>
            </div>
          )} */}

          {/* Side Txs */}
          {activeTab === "side_tx" && (
            <div className="space-y-6">
              <div className="bg-[#1a1e24] rounded-lg border border-[#2a2f3a] overflow-hidden">
                <div className="bg-[#21262d] px-6 py-4 border-b border-[#2a2f3a]">
                  <h3 className="text-xs font-bold text-purple-400 uppercase tracking-widest flex items-center gap-2">
                    <Activity size={14} /> Side Tx Summary
                  </h3>
                </div>
                <div className="p-6">
                  {sideTx?.sidetx_summary
                    ? <JsonViewer data={sideTx.sidetx_summary} />
                    : <p className="text-gray-600 italic text-sm">No side tx summary at this height.</p>
                  }
                </div>
              </div>

              <div className="bg-[#1a1e24] rounded-lg border border-[#2a2f3a] overflow-hidden">
                <div className="bg-[#21262d] px-6 py-4 border-b border-[#2a2f3a]">
                  <h3 className="text-xs font-bold text-blue-400 uppercase tracking-widest flex items-center gap-2">
                    <CheckCircle2 size={14} /> Side Tx Commits
                  </h3>
                </div>
                <div className="p-6">
                  {sideTx?.sidetx_commits
                    ? <JsonViewer data={sideTx.sidetx_commits} />
                    : <p className="text-gray-600 italic text-sm">No side tx commits at this height.</p>
                  }
                </div>
              </div>
            </div>
          )}

          {/* Events */}
          {activeTab === "events" && (
            <div className="bg-[#1a1e24] rounded-lg border border-[#2a2f3a] p-6 overflow-x-auto">
              <JsonViewer data={blockData.result_finalize_block} />
            </div>
          )}

          {/* Raw JSON */}
          {activeTab === "json" && (
            <div className="bg-[#1a1e24] rounded-lg border border-[#2a2f3a] p-6 overflow-x-auto">
              <JsonViewer data={blockData} />
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-4 px-6 py-4 gap-4 items-start">
      <div className="text-gray-500 text-xs font-semibold uppercase tracking-wider pt-0.5">
        {label}
      </div>
      <div className="col-span-3 text-sm leading-relaxed">
        {children}
      </div>
    </div>
  );
}

function TabItem({ label, active, onClick, count }: any) {
  return (
    <button
      onClick={onClick}
      className={`pb-3 px-1 text-sm font-semibold transition-all border-b-2 -mb-px whitespace-nowrap ${
        active
          ? "border-green-400 text-green-400"
          : "border-transparent text-gray-500 hover:text-gray-300"
      }`}
    >
      <span className="flex items-center gap-2">
        {label}
        {count !== undefined && (
          <span className={`px-1.5 py-0.5 rounded text-[10px] ${active ? "bg-green-400/20 text-green-400" : "bg-gray-800 text-gray-500"}`}>
            {count}
          </span>
        )}
      </span>
    </button>
  );
}