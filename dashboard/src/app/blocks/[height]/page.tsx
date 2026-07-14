"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import {
  ChevronLeft, ChevronRight, Layers, CheckCircle2, Info, Activity,
} from "lucide-react";
import moment from "moment";
import ShortName from "../../components/ShortName";
import JsonViewer from "../../components/JsonViewer";

const API_URL = process.env.NEXT_PUBLIC_METRICS_BACKEND_URL || "http://localhost:3001";

type Tab = "side_tx" | "transactions" | "events" | "json";
type Signatures = [
  {
    block_id_flag: number,
  }
]

export default function BlockDetailPage() {
  const { height } = useParams();
  const router = useRouter();
  const [block, setBlock] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [sideTx, setSideTx] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [txLoading] = useState(false);
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
          fetch(`${API_URL}/api/blocks/${height}`),
          fetch(`${API_URL}/api/txs?height=${height}`),
          fetch(`${API_URL}/api/sideTx/${height}`),
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
      voted: ((block.signatures? JSON.parse(block.signatures) : []) as Signatures).filter(x => x.block_id_flag == 2).length,
      total_validators: (block.signatures? JSON.parse(block.signatures) : []).length
    };
  }, [block]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar shrink={false} />
        <div className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-8 sm:px-6">
          <div className="skeleton mb-8 h-8 w-64" />
          <div className="card space-y-4 p-6">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex gap-6">
                <div className="skeleton h-4 w-32" />
                <div className="skeleton h-4 flex-1 max-w-xl" />
              </div>
            ))}
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !blockData) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar shrink={false} />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 animate-rise">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl border border-rose-500/25 bg-rose-500/[0.07]">
            <Info size={28} className="text-rose-400" />
          </span>
          <h2 className="text-2xl font-bold text-white">Block Not Found</h2>
          <p className="text-slate-500">{error || "The requested block could not be retrieved."}</p>
          <button
            onClick={() => router.push("/blocks")}
            className="mt-2 rounded-lg border border-[var(--edge)] bg-[var(--bg-panel)] px-6 py-2 text-sm font-semibold text-white transition-all hover:border-cyan-400/40 cursor-pointer"
          >
            Back to Blocks
          </button>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar shrink={false} />

      <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-8 sm:px-6">
        {/* Breadcrumb & Navigation */}
        <div className="mb-8 flex items-center justify-between animate-rise">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-600">Explorer</span>
            <span className="text-slate-700">/</span>
            <span className="cursor-pointer text-slate-500 transition-colors hover:text-cyan-300" onClick={() => router.push("/blocks")}>
              Blocks
            </span>
            <span className="text-slate-700">/</span>
            <span className="font-mono text-xs text-white">{Number(blockData.height).toLocaleString()}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => goToBlock(blockData.height - 1)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--edge)] bg-[var(--bg-panel)] text-slate-400 transition-all hover:border-cyan-400/40 hover:text-white cursor-pointer"
              title="Previous block"
            >
              <ChevronLeft size={17} />
            </button>
            <button
              onClick={() => goToBlock(blockData.height + 1)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--edge)] bg-[var(--bg-panel)] text-slate-400 transition-all hover:border-cyan-400/40 hover:text-white cursor-pointer"
              title="Next block"
            >
              <ChevronRight size={17} />
            </button>
          </div>
        </div>

        {/* Block Info Card */}
        <div className="card mb-8 overflow-hidden animate-rise">
          <div className="border-b border-[var(--edge)] bg-white/[0.02] px-6 py-4">
            <h2 className="section-title flex items-center gap-2">
              <Layers size={14} className="text-cyan-400" /> Block Information
            </h2>
          </div>

          <div className="divide-y divide-white/[0.05]">
            <InfoRow label="Chain ID">
              <span className="text-slate-200">{blockData.chain_id}</span>
            </InfoRow>
            <InfoRow label="Height">
              <span className="font-mono font-bold text-emerald-400">{blockData.height?.toLocaleString()}</span>
            </InfoRow>
            <InfoRow label="Time">
              <span className="text-slate-200">
                {moment.utc(blockData.time).local().toLocaleString()}
                <span className="ml-2 text-slate-500">({moment.utc(blockData.time).local().fromNow()})</span>
              </span>
            </InfoRow>
            <InfoRow label="Block Hash">
              <span className="break-all font-mono text-xs text-slate-300">{blockData.data_hash}</span>
            </InfoRow>
            <InfoRow label="App Hash">
              <span className="break-all font-mono text-xs text-slate-300">{blockData.app_hash}</span>
            </InfoRow>
            <InfoRow label="Proposer">
              <span className="break-all font-mono text-xs text-cyan-400">{blockData.proposer_address}</span>
            </InfoRow>
            <InfoRow label="Signatures">
              <span className="inline-flex items-center gap-2">
                <span className="font-mono text-xs text-slate-200">{blockData.voted}/{blockData.total_validators}</span>
                {blockData.total_validators > 0 && (
                  <span className="h-1.5 w-24 overflow-hidden rounded-full bg-white/[0.06]">
                    <span
                      className="block h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400"
                      style={{ width: `${(blockData.voted / blockData.total_validators) * 100}%` }}
                    />
                  </span>
                )}
              </span>
            </InfoRow>
            <InfoRow label="TX Count">
              <span className="font-mono text-slate-200">{blockData.transactions}</span>
            </InfoRow>
          </div>

          {blockData.block_tx && (
            <div className="border-t border-cyan-500/15 bg-cyan-500/[0.04] px-6 py-4">
              <p className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-400">
                <CheckCircle2 size={13} /> Heimdall Sidechain TX
              </p>
              <p className="break-all font-mono text-xs text-cyan-200/80">{blockData.block_tx}</p>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-6 border-b border-[var(--edge)]">
          <TabItem label="Side Txs" active={activeTab === "side_tx"} onClick={() => setActiveTab("side_tx")} />
          <TabItem label="Other Transactions" count={transactions.length} active={activeTab === "transactions"} onClick={() => setActiveTab("transactions")} />
          <TabItem label="Block Events" active={activeTab === "events"} onClick={() => setActiveTab("events")} />
          <TabItem label="Raw JSON" active={activeTab === "json"} onClick={() => setActiveTab("json")} />
        </div>

        {/* Tab Content */}
        <div className="min-h-[400px] py-6 animate-rise" key={activeTab}>
          {/* Transactions */}
          {activeTab === "transactions" && (
            <div className="card overflow-hidden">
              {txLoading ? (
                <div className="flex justify-center py-20">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500/20 border-t-emerald-400" />
                </div>
              ) : transactions.length === 0 ? (
                <div className="py-20 text-center font-mono text-sm text-slate-500">
                  No transactions found at this height.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th>TX Hash</th>
                        <th>Status</th>
                        <th>Messages</th>
                        <th>Memo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((tx: any, idx: number) => (
                        <tr
                          key={idx}
                          className="cursor-pointer"
                          onClick={() => router.push(`/tx/${tx.txhash || tx.hash}`)}
                        >
                          <td>
                            <span className="font-mono text-cyan-400">
                              <ShortName value={tx.txhash || tx.hash} maxLength={20} />
                            </span>
                          </td>
                          <td>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${tx.raw_log?.toLowerCase().includes("error")
                              ? "bg-rose-500/15 text-rose-400"
                              : "bg-emerald-500/15 text-emerald-400"
                              }`}>
                              {tx.raw_log?.toLowerCase().includes("error") ? "FAILED" : "SUCCESS"}
                            </span>
                          </td>
                          <td>
                            <div className="flex flex-wrap gap-1">
                              {(tx.messages || []).map((msg: any, mIdx: number) => (
                                <span key={mIdx} className="rounded-md border border-[var(--edge)] bg-white/[0.03] px-2 py-0.5 text-[10px] text-slate-300">
                                  {msg.typeUrl?.split(".").pop() || "Unknown"}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="max-w-[200px] truncate text-slate-500">
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

          {/* Side Txs */}
          {activeTab === "side_tx" && (
            <div className="space-y-6">
              <div className="card overflow-hidden">
                <div className="border-b border-[var(--edge)] bg-white/[0.02] px-6 py-4">
                  <h3 className="section-title flex items-center gap-2">
                    <Activity size={14} className="text-violet-400" /> Side Tx Summary
                  </h3>
                </div>
                <div className="p-6">
                  {sideTx?.sideTx?.sidetx_summary
                    ? <JsonViewer data={sideTx.sideTx.sidetx_summary} />
                    : <p className="text-sm text-slate-600">No side tx summary at this height.</p>
                  }
                </div>
              </div>

              <div className="card overflow-hidden">
                <div className="border-b border-[var(--edge)] bg-white/[0.02] px-6 py-4">
                  <h3 className="section-title flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-cyan-400" /> Side Tx Commits
                  </h3>
                </div>
                <div className="p-6">
                  {sideTx?.sideTx?.sidetx_commits
                    ? <JsonViewer data={sideTx.sideTx.sidetx_commits} />
                    : <p className="text-sm text-slate-600">No side tx commits at this height.</p>
                  }
                </div>
              </div>
            </div>
          )}

          {/* Events */}
          {activeTab === "events" && (
            <div className="card overflow-x-auto p-6">
              <JsonViewer data={blockData.result_finalize_block} />
            </div>
          )}

          {/* Raw JSON */}
          {activeTab === "json" && (
            <div className="card overflow-x-auto p-6">
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
    <div className="grid grid-cols-1 gap-1 px-6 py-4 sm:grid-cols-4 sm:gap-4 sm:items-start">
      <div className="pt-0.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </div>
      <div className="text-sm leading-relaxed sm:col-span-3">
        {children}
      </div>
    </div>
  );
}

function TabItem({ label, active, onClick, count }: any) {
  return (
    <button
      onClick={onClick}
      className={`-mb-px whitespace-nowrap border-b-2 px-1 pb-3 text-sm font-semibold transition-all cursor-pointer ${active
        ? "border-cyan-400 text-cyan-300"
        : "border-transparent text-slate-500 hover:text-slate-300"
        }`}
    >
      <span className="flex items-center gap-2">
        {label}
        {count !== undefined && (
          <span className={`rounded-md px-1.5 py-0.5 text-[10px] ${active ? "bg-cyan-400/15 text-cyan-300" : "bg-white/[0.05] text-slate-500"}`}>
            {count}
          </span>
        )}
      </span>
    </button>
  );
}
