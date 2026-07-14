"use client";

import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Clock,
  RotateCw,
  ArrowLeftRight,
} from "lucide-react";
import moment from "moment";
import { useRouter } from "next/navigation";
import ShortName from "../components/ShortName";
import { SupportUS } from "../components/SupportUs";

const API_URL = process.env.NEXT_PUBLIC_METRICS_BACKEND_URL || "http://localhost:3001";

export default function TransactionsPage() {
  const [txs, setTxs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const router = useRouter();

  const fetchTxs = async (p: number, isAuto = false) => {
    if (!isAuto) setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/txs?page=${p}&limit=25`);
      if (res.ok) {
        const data = await res.json();
        // Map DB fields to frontend-expected fields
        const mapped = (data.txs || []).map((tx: any) => ({
          ...tx,
          hash: tx.txhash || tx.hash,
          success: tx.success !== undefined ? tx.success : !tx.raw_log?.toLowerCase().includes('error'),
        }));
        // Only update if we got data, to prevent flashing "No transactions"
        if (mapped.length > 0 || !isAuto) {
          setTxs(mapped);
        }
      }
    } catch (err) {
      console.error("Failed to fetch transactions", err);
    } finally {
      if (!isAuto) setLoading(false);
    }
  };

  useEffect(() => {
    fetchTxs(page);

    let interval: any;
    if (autoRefresh && page === 1) {
      interval = setInterval(() => fetchTxs(1, true), 1000);
    }
    return () => clearInterval(interval);
  }, [page, autoRefresh]);

  const handleTxClick = (hash: string) => {
    router.push(`/tx/${hash}`);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SupportUS />

      <Navbar shrink={false} />

      <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-6 sm:px-6">
        <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center animate-rise">
          <div>
            <h1 className="flex items-center gap-3 text-2xl font-bold tracking-tight text-white">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--edge)] bg-[var(--bg-panel)]">
                <ArrowLeftRight size={17} className="text-cyan-400" />
              </span>
              Transactions
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Real-time transaction monitoring and decoding
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-all cursor-pointer ${autoRefresh
                ? "border-emerald-400/25 bg-emerald-400/[0.08] text-emerald-300"
                : "border-[var(--edge)] bg-[var(--bg-panel)] text-slate-500 hover:text-slate-300"
                }`}
            >
              <RotateCw size={14} className={autoRefresh ? "animate-spin-slow" : ""} />
              {autoRefresh ? "Auto Refresh On" : "Auto Refresh Off"}
            </button>

            <div className="group relative">
              <input
                type="text"
                placeholder="Search by TX hash..."
                className="w-64 rounded-lg border border-[var(--edge)] bg-[var(--bg-panel)] py-2 pl-9 pr-3 text-sm text-white placeholder:text-slate-600 transition-all focus:border-cyan-400/50 focus:outline-none focus:ring-2 focus:ring-cyan-400/10"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const val = (e.target as HTMLInputElement).value.trim();
                    if (val) handleTxClick(val);
                  }
                }}
              />
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 transition-colors group-focus-within:text-cyan-400"
              />
            </div>
          </div>
        </div>

        <div className="card flex flex-col overflow-hidden animate-rise">
          <div className="flex-1 overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th>TX Hash</th>
                  <th>Height</th>
                  <th>Status</th>
                  <th>Messages</th>
                  <th className="!text-right">Time</th>
                </tr>
              </thead>
              <tbody>
                {loading && txs.length === 0 ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={5} className="!py-4">
                        <div className="skeleton h-5 w-full" />
                      </td>
                    </tr>
                  ))
                ) : txs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                      No transactions found.
                    </td>
                  </tr>
                ) : (
                  txs.map((tx) => (
                    <tr
                      key={tx.hash}
                      className="group cursor-pointer"
                      onClick={() => handleTxClick(tx.hash)}
                    >
                      <td>
                        <span className="font-mono text-cyan-400 transition-colors group-hover:text-cyan-300">
                          <ShortName value={tx.hash} maxLength={16} />
                        </span>
                      </td>
                      <td>
                        <span
                          className="font-mono text-emerald-400/90 transition-colors hover:text-emerald-300 hover:underline underline-offset-4"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/blocks/${tx.height}`);
                          }}
                        >
                          {tx.height.toLocaleString()}
                        </span>
                      </td>
                      <td>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${!tx.success ? "bg-rose-500/15 text-rose-400" : "bg-emerald-500/15 text-emerald-400"
                          }`}>
                          {!tx.success ? "FAILED" : "SUCCESS"}
                        </span>
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-1">
                          {(tx.messages || []).map((msg: any, idx: number) => (
                            <span key={idx} className="rounded-md border border-[var(--edge)] bg-white/[0.03] px-2 py-0.5 text-[10px] uppercase tracking-tight text-slate-400">
                              {msg.typeUrl?.split('.').pop() || "Unknown"}
                            </span>
                          ))}
                          {(!tx.messages || tx.messages.length === 0) && (
                            <span className="text-[10px] text-slate-600">No messages</span>
                          )}
                        </div>
                      </td>
                      <td className="!text-right">
                        <div className="flex flex-col items-end">
                          <span className="text-xs font-medium text-slate-300">{moment.utc(tx.time).local().fromNow()}</span>
                          <span className="mt-0.5 flex items-center gap-1 text-[10px] text-slate-500">
                            <Clock size={10} />
                            {moment.utc(tx.time).local().format("HH:mm:ss")}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="mt-auto flex items-center justify-between border-t border-[var(--edge)] bg-white/[0.02] px-6 py-4">
            <span className="text-xs font-medium text-slate-500">
              Showing <span className="text-slate-300">{txs.length}</span> transactions
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="rounded-lg border border-[var(--edge)] bg-[var(--bg-panel)] p-2 text-slate-400 transition-all hover:border-cyan-400/40 hover:text-white disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
              >
                <ChevronLeft size={16} />
              </button>
              <div className="rounded-lg border border-[var(--edge)] bg-[var(--bg-panel)] px-4 py-1.5 font-mono text-xs font-bold text-cyan-300">
                PAGE {page}
              </div>
              <button
                onClick={() => setPage(page + 1)}
                disabled={txs.length < 25}
                className="rounded-lg border border-[var(--edge)] bg-[var(--bg-panel)] p-2 text-slate-400 transition-all hover:border-cyan-400/40 hover:text-white disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
