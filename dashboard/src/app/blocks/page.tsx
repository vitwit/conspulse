"use client";

import React, { useEffect, useState, useCallback } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import BlocksTable from "./BlocksTable";
import { ChevronLeft, ChevronRight, RefreshCw, AlertCircle, Search, Boxes } from "lucide-react";
import { useRouter } from "next/navigation";
import { SupportUS } from "../components/SupportUs";

const API_URL = process.env.NEXT_PUBLIC_METRICS_BACKEND_URL || "http://localhost:3001";

const LIMIT = 25;
const REFRESH_INTERVAL = 1_000;

export default function BlocksPage() {
  const [blocks, setBlocks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchHeight, setSearchHeight] = useState("");

  const router = useRouter();

  const handleSearch = () => {
    const clean = searchHeight.replace(/,/g, "").trim();
    if (!/^\d+$/.test(clean)) return;
    const num = Number(clean);
    if (num > 0) router.push(`/blocks/${num}`);
  };

  const fetchBlocks = useCallback(async (pageNum: number, isAuto = false) => {
    isAuto ? setIsRefreshing(true) : setLoading(true);
    if (!isAuto) setError(null);

    try {
      const res = await fetch(`${API_URL}/api/blocks?page=${pageNum}&limit=${LIMIT}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setBlocks(data.blocks || []);
      setError(null); // clear error on success
    } catch (err: any) {
      // Auto-refresh failures: keep showing old data, don't show error
      // Manual load failures: show error
      if (!isAuto) setError(err.message || "Failed to load blocks");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchBlocks(page);
    if (page !== 1) return;
    const interval = setInterval(() => fetchBlocks(1, true), REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [page, fetchBlocks]);

  return (
    <div className="min-h-screen flex flex-col">
      <SupportUS />

      <Navbar shrink={false} />

      <main className="flex-1 mx-auto w-full max-w-[1600px] px-4 sm:px-6 pb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-6 pb-6 animate-rise">
          <div>
            <h1 className="flex items-center gap-3 text-2xl font-bold tracking-tight text-white">
              Recent <span className="text-gradient">Blocks</span>
              {isRefreshing && <RefreshCw size={16} className="animate-spin text-emerald-400" />}
            </h1>
            <p className="mt-1 text-sm text-slate-500">Real-time block production on the network</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="group relative">
              <input
                type="text"
                placeholder="Search by block height..."
                value={searchHeight}
                onChange={(e) => setSearchHeight(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSearch();
                }}
                className="w-56 rounded-lg border border-[var(--edge)] bg-[var(--bg-panel)] py-2 pl-9 pr-3 text-sm text-white placeholder:text-slate-600 transition-all focus:border-cyan-400/50 focus:outline-none focus:ring-2 focus:ring-cyan-400/10"
              />
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 transition-colors group-focus-within:text-cyan-400"
              />
            </div>

            <div className="flex items-center gap-1 rounded-lg border border-[var(--edge)] bg-[var(--bg-panel)] p-1">
              <button
                onClick={() => { if (page > 1 && !loading) setPage(p => p - 1); }}
                disabled={page === 1 || loading}
                className="rounded-md p-2 text-slate-400 transition-colors hover:bg-white/[0.05] hover:text-white disabled:cursor-not-allowed disabled:opacity-30 cursor-pointer"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="px-3 font-mono text-sm font-bold text-white">
                Page {page}
              </span>
              <button
                onClick={() => { if (!loading && blocks.length === LIMIT) setPage(p => p + 1); }}
                disabled={loading || blocks.length < LIMIT}
                className="rounded-md p-2 text-slate-400 transition-colors hover:bg-white/[0.05] hover:text-white disabled:cursor-not-allowed disabled:opacity-30 cursor-pointer"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 flex items-center justify-between gap-4 rounded-xl border border-rose-500/25 bg-rose-500/[0.06] p-4 animate-rise">
            <div className="flex items-center gap-3 text-rose-300">
              <AlertCircle size={18} className="shrink-0" />
              <div>
                <p className="text-sm font-semibold">Failed to load blocks</p>
                <p className="mt-0.5 text-xs text-rose-400/80">{error} — check that the metrics backend is reachable</p>
              </div>
            </div>
            <button
              onClick={() => fetchBlocks(page)}
              className="shrink-0 rounded-md bg-rose-500/15 px-3 py-1.5 text-xs font-semibold text-rose-300 transition-colors hover:bg-rose-500/25 cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {loading && blocks.length === 0 ? (
          <div className="card overflow-hidden animate-rise">
            <div className="space-y-0 p-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="flex items-center gap-6 border-b border-white/[0.04] py-4 last:border-b-0">
                  <div className="skeleton h-4 w-24" />
                  <div className="skeleton h-4 w-48" />
                  <div className="skeleton h-4 w-40" />
                  <div className="skeleton h-4 w-10" />
                  <div className="skeleton ml-auto h-4 w-32" />
                </div>
              ))}
            </div>
          </div>
        ) : blocks.length === 0 && !error ? (
          <div className="card flex flex-col items-center justify-center gap-3 py-20 text-slate-500 animate-rise">
            <Boxes size={32} className="text-slate-700" />
            No blocks found
          </div>
        ) : (
          <div className="animate-rise">
            <BlocksTable blocks={blocks} />
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
