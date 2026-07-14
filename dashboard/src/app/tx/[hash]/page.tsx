"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import {
  Hash, CheckCircle2, XCircle,
  ArrowLeft, ChevronRight, Copy, Check
} from "lucide-react";
import moment from "moment";
import JsonViewer from "../../components/JsonViewer";

const API_URL = process.env.NEXT_PUBLIC_METRICS_BACKEND_URL || "http://localhost:3001";

type Tab = "messages" | "events" | "raw";

export default function TransactionDetailPage() {
  const { hash } = useParams();
  const router = useRouter();
  const [tx, setTx] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("messages");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!hash) return;
    async function fetchTx() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_URL}/api/txs/${hash}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const raw = data.tx;
        setTx({
          ...raw,
          hash: raw.txhash || raw.hash,
          success: raw.success !== undefined
            ? raw.success
            : !raw.raw_log?.toLowerCase().includes("error"),
          gas_used: raw.gas_used || 0,
          gas_wanted: raw.gas_wanted || 0,
        });
      } catch (err: any) {
        setError(err.message || "Failed to load transaction");
      } finally {
        setLoading(false);
      }
    }
    fetchTx();
  }, [hash]);

  const copyHash = () => {
    navigator.clipboard.writeText(tx?.hash || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar shrink={false} />
        <div className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-8 sm:px-6">
          <div className="skeleton mb-6 h-6 w-72" />
          <div className="skeleton mb-8 h-9 w-full max-w-2xl" />
          <div className="card space-y-4 p-6">
            {Array.from({ length: 6 }).map((_, i) => (
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

  if (error || !tx) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar shrink={false} />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 animate-rise">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl border border-rose-500/25 bg-rose-500/[0.07]">
            <XCircle size={28} className="text-rose-400" />
          </span>
          <h2 className="text-2xl font-bold text-white">Transaction Not Found</h2>
          <p className="text-sm text-slate-500">{error}</p>
          <button
            onClick={() => router.push("/transactions")}
            className="mt-2 rounded-lg border border-[var(--edge)] bg-[var(--bg-panel)] px-6 py-2 text-sm font-semibold text-white transition-all hover:border-cyan-400/40 cursor-pointer"
          >
            Back to Transactions
          </button>
        </div>
        <Footer />
      </div>
    );
  }

  const isFailed = tx.success === false;
  const messages = tx.messages || [];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar shrink={false} />

      <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-8 sm:px-6">
        {/* Breadcrumb */}
        <div className="mb-6 flex items-center gap-3 animate-rise">
          <button
            onClick={() => router.back()}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--edge)] bg-[var(--bg-panel)] text-slate-400 transition-all hover:border-cyan-400/40 hover:text-white cursor-pointer"
          >
            <ArrowLeft size={15} />
          </button>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span className="text-slate-600">Explorer</span>
            <ChevronRight size={13} className="text-slate-700" />
            <span className="cursor-pointer transition-colors hover:text-cyan-300" onClick={() => router.push("/transactions")}>
              Transactions
            </span>
            <ChevronRight size={13} className="text-slate-700" />
            <span className="font-mono text-xs text-white">{tx.hash?.substring(0, 16)}...{tx.hash?.slice(-8)}</span>
          </div>
        </div>

        {/* Status Badge */}
        <div className="mb-6 flex items-center gap-3 animate-rise">
          <span className={`flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-bold ring-1 ${isFailed
            ? "bg-rose-500/10 text-rose-300 ring-rose-500/25"
            : "bg-emerald-500/10 text-emerald-300 ring-emerald-500/25"
            }`}>
            {isFailed ? <XCircle size={13} /> : <CheckCircle2 size={13} />}
            {isFailed ? "TRANSACTION FAILED" : "TRANSACTION SUCCESS"}
          </span>
        </div>

        {/* Hash Row */}
        <div className="mb-8 flex items-center gap-3 animate-rise">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--edge)] bg-[var(--bg-panel)]">
            <Hash size={15} className="text-cyan-400" />
          </span>
          <span className="break-all font-mono text-sm text-white">{tx.hash}</span>
          <button
            onClick={copyHash}
            className="shrink-0 rounded-md p-1.5 text-slate-500 transition-all hover:bg-white/[0.06] hover:text-white cursor-pointer"
          >
            {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
          </button>
        </div>

        {/* Transaction Info Table */}
        <div className="card mb-8 overflow-hidden animate-rise">
          <div className="border-b border-[var(--edge)] bg-white/[0.02] px-6 py-4">
            <h2 className="section-title">
              Transaction Information
            </h2>
          </div>

          <div className="divide-y divide-white/[0.05]">
            <InfoRow label="Height">
              <span
                className="cursor-pointer font-mono text-emerald-400 transition-colors hover:text-emerald-300 hover:underline underline-offset-4"
                onClick={() => router.push(`/blocks/${tx.height}`)}
              >
                {tx.height?.toLocaleString()}
              </span>
            </InfoRow>

            <InfoRow label="Time">
              <span className="text-slate-200">
                {moment.utc(tx.time).local().toLocaleString()}
                <span className="ml-2 text-slate-500">({moment.utc(tx.time).local().fromNow()})</span>
              </span>
            </InfoRow>

            <InfoRow label="Gas Used / Wanted">
              <span className="font-mono text-slate-200">
                {(tx.gas_used || 0).toLocaleString()}
                <span className="text-slate-500"> / </span>
                {(tx.gas_wanted || 0).toLocaleString()}
              </span>
            </InfoRow>

            <InfoRow label="Fee">
              <span className="font-mono text-slate-200">{tx.fee_amount || "0"}</span>
            </InfoRow>

            <InfoRow label="Memo">
              <span className={tx.memo ? "text-slate-200" : "text-slate-600"}>
                {tx.memo || "—"}
              </span>
            </InfoRow>

            {tx.sender && (
              <InfoRow label="Sender">
                <span className="break-all font-mono text-xs text-cyan-400">{tx.sender}</span>
              </InfoRow>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-0 flex gap-6 border-b border-[var(--edge)]">
          {(["messages", "events", "raw"] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`-mb-px border-b-2 px-1 pb-3 text-sm font-semibold capitalize transition-all cursor-pointer ${activeTab === tab
                ? "border-cyan-400 text-cyan-300"
                : "border-transparent text-slate-500 hover:text-slate-300"
                }`}
            >
              {tab === "messages" ? `Messages (${messages.length})` : tab === "events" ? "Event Logs" : "Raw Json"}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="mt-0 animate-rise" key={activeTab}>
          {/* Messages Tab */}
          {activeTab === "messages" && (
            <div className="space-y-4 pt-6">
              {messages.length === 0 ? (
                <div className="card p-12 text-center text-sm text-slate-500">
                  No messages found in this transaction.
                </div>
              ) : (
                messages.map((msg: any, idx: number) => (
                  <MessageCard key={idx} msg={msg} index={idx} />
                ))
              )}
            </div>
          )}

          {/* Events Tab */}
          {activeTab === "events" && (
            <div className="pt-6">
              {isFailed && tx.raw_log && (
                <div className="card mb-4 overflow-hidden !border-rose-500/25">
                  <div className="border-b border-rose-500/20 bg-rose-500/[0.05] px-6 py-3">
                    <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-rose-400">
                      <XCircle size={13} /> Error Log
                    </h3>
                  </div>
                  <div className="p-6">
                    <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-rose-300">
                      {tx.raw_log}
                    </pre>
                  </div>
                </div>
              )}
              <div className="card p-6">
                <JsonViewer data={JSON.parse(tx.events) || []} initialExpanded={true} />
              </div>
            </div>
          )}

          {/* Raw JSON Tab */}
          {activeTab === "raw" && (
            <div className="pt-6">
              <div className="card max-h-[70vh] overflow-auto p-6">
                <JsonViewer data={tx} initialExpanded={true} />
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

// Individual message card — collapsible like Mintscan
function MessageCard({ msg, index }: { msg: any; index: number }) {
  const [expanded, setExpanded] = useState(true);
  const msgType = msg.typeUrl?.split(".").pop() || "Unknown";
  const msgCategory = msg.typeUrl?.split(".").slice(-2, -1)[0] || "";

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="flex w-full items-center justify-between px-6 py-4 text-left transition-colors hover:bg-white/[0.03] cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-400/10 font-mono text-xs font-bold text-cyan-300">
            {index + 1}
          </span>
          <span className="text-sm font-semibold text-white">
            {msgCategory ? `${msgCategory} : ` : ""}
            <span className="text-cyan-300">{msgType}</span>
          </span>
        </div>
        <ChevronRight
          size={16}
          className={`text-slate-500 transition-transform duration-200 ${expanded ? "rotate-90" : ""}`}
        />
      </button>

      {/* Body */}
      {expanded && (
        <div className="border-t border-[var(--edge)] px-6 py-5">
          {/* Pull out key fields cleanly if available */}
          {msg.senderAddress && (
            <MsgRow label="Sender" value={msg.senderAddress} mono />
          )}
          {msg.validatorAddress && (
            <MsgRow label="Validator" value={msg.validatorAddress} mono />
          )}
          {msg.delegatorAddress && (
            <MsgRow label="Delegator" value={msg.delegatorAddress} mono />
          )}
          {msg.fromAddress && (
            <MsgRow label="From" value={msg.fromAddress} mono />
          )}
          {msg.toAddress && (
            <MsgRow label="To" value={msg.toAddress} mono />
          )}

          {/* Full message JSON */}
          <div className="mt-4">
            <p className="section-title mb-2">Messages</p>
            <div className="rounded-lg border border-[var(--edge)] bg-[#04060c]/70 p-4">
              <JsonViewer data={msg} initialExpanded={true} />
            </div>
          </div>
        </div>
      )}
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

function MsgRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="mb-3">
      <p className="mb-1 text-xs font-semibold text-slate-500">{label}:</p>
      <p className={`break-all text-sm text-slate-200 ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}
