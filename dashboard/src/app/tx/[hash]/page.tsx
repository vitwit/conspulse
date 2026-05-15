"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import {
  Hash, Clock, Layers, Zap, CheckCircle2, XCircle,
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
      <div className="min-h-screen bg-[#0e1014] flex flex-col">
        <Navbar shrink={false} />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !tx) {
    return (
      <div className="min-h-screen bg-[#0e1014] flex flex-col">
        <Navbar shrink={false} />
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <XCircle size={48} className="text-red-500" />
          <h2 className="text-2xl font-bold text-white">Transaction Not Found</h2>
          <p className="text-gray-400 text-sm">{error}</p>
          <button
            onClick={() => router.push("/transactions")}
            className="mt-4 px-6 py-2 bg-[#2a2f3a] text-white rounded-lg hover:bg-[#343a47] transition-colors"
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
    <div className="min-h-screen bg-[#0e1014] flex flex-col font-sans">
      <Navbar shrink={false} />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.back()}
            className="p-2 bg-[#1a1e24] border border-[#2a2f3a] rounded-lg text-gray-400 hover:text-white transition-all"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>Explorer</span>
            <ChevronRight size={13} className="text-gray-700" />
            <span className="cursor-pointer hover:text-gray-300" onClick={() => router.push("/transactions")}>
              Transactions
            </span>
            <ChevronRight size={13} className="text-gray-700" />
            <span className="text-white font-mono text-xs">{tx.hash?.substring(0, 16)}...{tx.hash?.slice(-8)}</span>
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-3 mb-6">
          <span className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold ring-1 ${isFailed
              ? "bg-red-500/10 text-red-400 ring-red-500/20"
              : "bg-green-500/10 text-green-400 ring-green-500/20"
            }`}>
            {isFailed ? <XCircle size={13} /> : <CheckCircle2 size={13} />}
            {isFailed ? "TRANSACTION FAILED" : "TRANSACTION SUCCESS"}
          </span>
        </div>

        {/* Hash Row */}
        <div className="flex items-center gap-3 mb-8">
          <Hash size={18} className="text-gray-500 shrink-0" />
          <span className="text-white font-mono text-sm break-all">{tx.hash}</span>
          <button
            onClick={copyHash}
            className="shrink-0 p-1.5 rounded text-gray-500 hover:text-white hover:bg-[#2a2f3a] transition-all"
          >
            {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
          </button>
        </div>

        {/* Transaction Info Table */}
        <div className="bg-[#1a1e24] rounded-xl border border-[#2a2f3a] mb-8 overflow-hidden">
          <div className="px-6 py-4 border-b border-[#2a2f3a] bg-[#1d2127]">
            <h2 className="text-sm font-bold text-gray-300 uppercase tracking-widest">
              Transaction Information
            </h2>
          </div>

          <div className="divide-y divide-[#2a2f3a]">
            <InfoRow label="Height">
              <span
                className="text-green-400 font-mono cursor-pointer hover:underline"
                onClick={() => router.push(`/blocks/${tx.height}`)}
              >
                {tx.height?.toLocaleString()}
              </span>
            </InfoRow>

            <InfoRow label="Time">
              <span className="text-gray-200">
                {moment.utc(tx.time).local().toLocaleString()}
                <span className="text-gray-500 ml-2">({moment.utc(tx.time).local().fromNow()})</span>
              </span>
            </InfoRow>

            <InfoRow label="Gas Used / Wanted">
              <span className="text-gray-200 font-mono">
                {(tx.gas_used || 0).toLocaleString()}
                <span className="text-gray-500"> / </span>
                {(tx.gas_wanted || 0).toLocaleString()}
              </span>
            </InfoRow>

            <InfoRow label="Fee">
              <span className="text-gray-200 font-mono">{tx.fee_amount || "0"}</span>
            </InfoRow>

            <InfoRow label="Memo">
              <span className={tx.memo ? "text-gray-200" : "text-gray-600"}>
                {tx.memo || "—"}
              </span>
            </InfoRow>

            {tx.sender && (
              <InfoRow label="Sender">
                <span className="text-blue-400 font-mono text-xs break-all">{tx.sender}</span>
              </InfoRow>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-[#2a2f3a] flex gap-6 mb-0">
          {(["messages", "events", "raw"] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 px-1 text-sm font-semibold capitalize transition-all border-b-2 -mb-px ${activeTab === tab
                  ? "border-green-400 text-green-400"
                  : "border-transparent text-gray-500 hover:text-gray-300"
                }`}
            >
              {tab === "messages" ? `Messages (${messages.length})` : tab === "events" ? "Event Logs" : "Raw Json"}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="mt-0">
          {/* Messages Tab */}
          {activeTab === "messages" && (
            <div className="space-y-4 pt-6">
              {messages.length === 0 ? (
                <div className="bg-[#1a1e24] rounded-xl border border-[#2a2f3a] p-12 text-center text-gray-500 italic text-sm">
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
                <div className="bg-[#1a1e24] rounded-xl border border-red-900/30 overflow-hidden mb-4">
                  <div className="px-6 py-3 border-b border-red-900/30 bg-red-500/5">
                    <h3 className="text-xs font-bold text-red-400 uppercase tracking-widest flex items-center gap-2">
                      <XCircle size={13} /> Error Log
                    </h3>
                  </div>
                  <div className="p-6">
                    <pre className="text-red-300 font-mono text-xs leading-relaxed whitespace-pre-wrap">
                      {tx.raw_log}
                    </pre>
                  </div>
                </div>
              )}
              <div className="bg-[#1a1e24] rounded-xl border border-[#2a2f3a] p-6">
                <JsonViewer data={JSON.parse(tx.events) || []} initialExpanded={true} />
              </div>
            </div>
          )}

          {/* Raw JSON Tab */}
          {activeTab === "raw" && (
            <div className="pt-6">
              <div className="bg-[#1a1e24] rounded-xl border border-[#2a2f3a] p-6 overflow-auto max-h-[70vh]">
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
    <div className="bg-[#1a1e24] rounded-xl border border-[#2a2f3a] overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-white/5 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-gray-500 font-mono text-sm font-bold">#{index + 1}.</span>
          <span className="text-white font-semibold text-sm">
            {msgCategory ? `${msgCategory} : ` : ""}
            <span className="text-blue-300">{msgType}</span>
          </span>
        </div>
        <ChevronRight
          size={16}
          className={`text-gray-500 transition-transform ${expanded ? "rotate-90" : ""}`}
        />
      </button>

      {/* Body */}
      {expanded && (
        <div className="border-t border-[#2a2f3a] px-6 py-5">
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
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2">Messages:</p>
            <div className="bg-[#13161c] rounded-lg p-4 border border-[#2a2f3a]">
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

function MsgRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="mb-3">
      <p className="text-xs text-gray-500 font-semibold mb-1">{label}:</p>
      <p className={`text-gray-200 text-sm break-all ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}