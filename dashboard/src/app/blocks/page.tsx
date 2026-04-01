"use client";

import React, { useEffect, useState, useCallback } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import BlocksTable from "./BlocksTable";
import { ChevronLeft, ChevronRight, RefreshCw, AlertCircle, Search } from "lucide-react";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

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
      const res = await fetch(`${API_URL}/blocks?page=${pageNum}&limit=${LIMIT}`);
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
    <div className="min-h-screen bg-[#0e1014] flex flex-col font-sans">
      <Navbar shrink={false} />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              Recent Blocks
              {isRefreshing && <RefreshCw size={18} className="text-green-500 animate-spin" />}
            </h1>
            <p className="text-gray-400 text-sm mt-1">Real-time block production on the network</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center bg-[#1a1e24] border border-[#2a2f3a] rounded-lg px-3 py-2 focus-within:border-blue-500/50 transition-all">
              <Search size={18} className="text-gray-500" />
              <input 
                type="text" 
                placeholder="Search by Block Height..." 
                value={searchHeight}
                onChange={(e) => setSearchHeight(e.target.value)}
                className="bg-transparent border-none outline-none text-white text-sm ml-2 w-48"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSearch();
                }}
              />
            </div>

            <div className="flex items-center gap-2 bg-[#1a1e24] p-1 rounded-lg border border-[#2a2f3a]">
            <button
              onClick={() => { if (page > 1 && !loading) setPage(p => p - 1); }}
              disabled={page === 1 || loading}
              className="p-2 rounded-md hover:bg-[#2a2f3a] disabled:opacity-30 disabled:cursor-not-allowed text-gray-400 transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="px-4 text-white font-mono font-bold border-x border-[#2a2f3a]">
              Page {page}
            </span>
            <button
              onClick={() => { if (!loading && blocks.length === LIMIT) setPage(p => p + 1); }}
              disabled={loading || blocks.length < LIMIT}
              className="p-2 rounded-md hover:bg-[#2a2f3a] disabled:opacity-30 disabled:cursor-not-allowed text-gray-400 transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>

        {error && (
          <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 mb-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-red-400">
              <AlertCircle size={18} className="shrink-0" />
              <div>
                <p className="font-semibold text-sm">Failed to load blocks</p>
                <p className="text-xs text-red-500 mt-0.5">{error} — check that your backend is running on port 3001</p>
              </div>
            </div>
            <button
              onClick={() => fetchBlocks(page)}
              className="shrink-0 text-xs px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-md transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {loading && blocks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-12 h-12 border-4 border-green-500/20 border-t-green-500 rounded-full animate-spin" />
            <p className="text-gray-500">Fetching latest blocks...</p>
          </div>
        ) : (
          <BlocksTable blocks={blocks} />
        )}
      </main>

      <Footer />
    </div>
  );
}