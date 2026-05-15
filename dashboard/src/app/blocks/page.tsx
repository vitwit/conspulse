"use client";

import React, { useEffect, useState, useCallback } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import BlocksTable from "./BlocksTable";
import { ChevronLeft, ChevronRight, RefreshCw, AlertCircle, Search, Box } from "lucide-react";
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
      setError(null);
    } catch (err: any) {
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
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg-primary)" }}>
      <SupportUS />
      <Navbar shrink={false} />

      <main className="flex-1 max-w-[1400px] mx-auto w-full px-4 sm:px-6 py-8">

        {/* ── Page Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(63,185,80,0.1)", color: "var(--accent-green)" }}
            >
              <Box size={18} />
            </div>
            <div>
              <h1
                className="text-xl font-semibold flex items-center gap-2"
                style={{ color: "var(--text-primary)" }}
              >
                Recent Blocks
                {isRefreshing && (
                  <RefreshCw
                    size={14}
                    className="animate-spin"
                    style={{ color: "var(--accent-green)" }}
                  />
                )}
              </h1>
              <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
                Real-time block production on the network
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div
              className="flex items-center gap-2 rounded-lg px-3 py-2 border transition-all focus-within:border-[var(--accent-blue)]"
              style={{
                background: "var(--bg-surface)",
                borderColor: "var(--border-default)",
              }}
            >
              <Search size={14} style={{ color: "var(--text-muted)" }} />
              <input
                type="text"
                placeholder="Search by height…"
                value={searchHeight}
                onChange={(e) => setSearchHeight(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
                className="bg-transparent border-none outline-none text-sm w-44"
                style={{ color: "var(--text-primary)" }}
              />
            </div>

            {/* Pagination */}
            <div
              className="flex items-center gap-1 rounded-lg border p-1"
              style={{ background: "var(--bg-surface)", borderColor: "var(--border-default)" }}
            >
              <button
                onClick={() => { if (page > 1 && !loading) setPage((p) => p - 1); }}
                disabled={page === 1 || loading}
                className="p-1.5 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ color: "var(--text-secondary)" }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "var(--bg-elevated)";
                  (e.currentTarget as HTMLElement).style.color = "var(--text-primary)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "transparent";
                  (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)";
                }}
              >
                <ChevronLeft size={16} />
              </button>

              <span
                className="px-3 font-mono text-sm font-medium border-x"
                style={{ color: "var(--text-primary)", borderColor: "var(--border-default)" }}
              >
                {page}
              </span>

              <button
                onClick={() => { if (!loading && blocks.length === LIMIT) setPage((p) => p + 1); }}
                disabled={loading || blocks.length < LIMIT}
                className="p-1.5 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ color: "var(--text-secondary)" }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "var(--bg-elevated)";
                  (e.currentTarget as HTMLElement).style.color = "var(--text-primary)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "transparent";
                  (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)";
                }}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* ── Error State ── */}
        {error && (
          <div
            className="rounded-lg p-4 mb-6 flex items-center justify-between gap-4 border"
            style={{
              background: "rgba(248,81,73,0.06)",
              borderColor: "rgba(248,81,73,0.25)",
            }}
          >
            <div className="flex items-center gap-3">
              <AlertCircle size={16} style={{ color: "var(--accent-red)", flexShrink: 0 }} />
              <div>
                <p className="text-sm font-semibold" style={{ color: "var(--accent-red)" }}>
                  Failed to load blocks
                </p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                  {error} — check that your backend is running on port 3001
                </p>
              </div>
            </div>
            <button
              onClick={() => fetchBlocks(page)}
              className="shrink-0 text-xs px-3 py-1.5 rounded-md border font-medium transition-colors"
              style={{
                color: "var(--accent-red)",
                borderColor: "rgba(248,81,73,0.35)",
                background: "rgba(248,81,73,0.08)",
              }}
            >
              Retry
            </button>
          </div>
        )}

        {/* ── Loading Spinner ── */}
        {loading && blocks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div
              className="w-10 h-10 border-[3px] rounded-full animate-spin"
              style={{
                borderColor: "rgba(63,185,80,0.15)",
                borderTopColor: "var(--accent-green)",
              }}
            />
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Fetching latest blocks…
            </p>
          </div>
        ) : (
          <BlocksTable blocks={blocks} />
        )}
      </main>

      <Footer />
    </div>
  );
}
