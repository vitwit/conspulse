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
  Hash,
} from "lucide-react";
import moment from "moment";
import { useRouter } from "next/navigation";
import ShortName from "../components/ShortName";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

export default function TransactionsPage() {
  const [txs, setTxs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const router = useRouter();

  const fetchTxs = async (p: number) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/txs?page=${p}&limit=25`);
      if (res.ok) {
        const data = await res.json();
        // Map DB fields to frontend-expected fields
        const mapped = (data.txs || []).map((tx: any) => ({
          ...tx,
          hash: tx.txhash || tx.hash,
          success: tx.success !== undefined ? tx.success : !tx.raw_log?.toLowerCase().includes('error'),
        }));
        setTxs(mapped);
      }
    } catch (err) {
      console.error("Failed to fetch transactions", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTxs(page);

    let interval: any;
    if (autoRefresh && page === 1) {
      interval = setInterval(() => fetchTxs(1), 5000);
    }
    return () => clearInterval(interval);
  }, [page, autoRefresh]);

  const handleTxClick = (hash: string) => {
    router.push(`/tx/${hash}`);
  };

  return (
    <div className="min-h-screen bg-[#0e1014] flex flex-col font-sans">
      <Navbar shrink={false} />
      
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Hash className="text-blue-500" size={24} />
              Transactions
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <button 
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    autoRefresh 
                    ? "bg-green-500/10 text-green-400 border border-green-500/20" 
                    : "bg-[#1a1e24] text-gray-500 border border-[#2a2f3a]"
                }`}
            >
                <RotateCw size={14} className={autoRefresh ? "animate-spin-slow" : ""} />
                {autoRefresh ? "Auto Refresh On" : "Auto Refresh Off"}
            </button>
            
            <div className="flex items-center bg-[#1a1e24] border border-[#2a2f3a] rounded-lg px-3 py-2 focus-within:border-blue-500/50 transition-all">
              <Search size={18} className="text-gray-500" />
              <input 
                type="text" 
                placeholder="Search by TX Hash..." 
                className="bg-transparent border-none outline-none text-white text-sm ml-2 w-64"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const val = (e.target as HTMLInputElement).value.trim();
                    if (val) handleTxClick(val);
                  }
                }}
              />
            </div>
          </div>
        </div>

        <div className="bg-[#1a1e24] rounded-xl border border-[#2a2f3a] overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left">
              <thead>
                <tr className="bg-[#21262d] text-gray-400 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="px-6 py-4">TX Hash</th>
                  <th className="px-6 py-4">Height</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Messages</th>
                  <th className="px-6 py-4 text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2a2f3a]">
                {loading && txs.length === 0 ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={5} className="px-6 py-8 bg-[#1a1e24]/50"></td>
                    </tr>
                  ))
                ) : txs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-20 text-center text-gray-500 italic">
                      No transactions found.
                    </td>
                  </tr>
                ) : (
                  txs.map((tx) => (
                    <tr 
                      key={tx.hash} 
                      className="hover:bg-white/5 transition-colors cursor-pointer group"
                      onClick={() => handleTxClick(tx.hash)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                           <span className="text-blue-400 font-mono group-hover:text-blue-300 transition-colors">
                            <ShortName value={tx.hash} maxLength={16} />
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-gray-300 font-mono" onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/blocks/${tx.height}`);
                        }}>
                          {tx.height.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          !tx.success ? "bg-red-500/20 text-red-400" : "bg-green-500/20 text-green-400"
                        }`}>
                          {!tx.success ? "FAILED" : "SUCCESS"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                         <div className="flex flex-wrap gap-1">
                            {(tx.messages || []).map((msg: any, idx: number) => (
                              <span key={idx} className="bg-[#2a2f3a] px-2 py-0.5 rounded text-[10px] text-gray-400 uppercase tracking-tight">
                                {msg.typeUrl?.split('.').pop() || "Unknown"}
                              </span>
                            ))}
                            {(!tx.messages || tx.messages.length === 0) && (
                              <span className="text-gray-600 italic text-[10px]">No messages</span>
                            )}
                         </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex flex-col items-end">
                           <span className="text-gray-300 text-xs font-medium">{moment(tx.time).fromNow()}</span>
                           <span className="text-gray-600 text-[10px] flex items-center gap-1">
                             <Clock size={10} />
                             {moment(tx.time).format("HH:mm:ss")}
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
          <div className="bg-[#21262d] px-6 py-4 flex items-center justify-between border-t border-[#2a2f3a]">
            <span className="text-xs text-gray-500 font-medium">
              Showing <span className="text-gray-300">{txs.length}</span> transactions
            </span>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="p-2 rounded bg-[#1a1e24] border border-[#2a2f3a] text-gray-500 hover:text-white disabled:opacity-30 transition-all shadow-inner"
              >
                <ChevronLeft size={16} />
              </button>
              <div className="px-4 py-1.5 bg-[#0e1014] border border-[#2a2f3a] rounded font-mono text-xs text-blue-400 font-bold">
                PAGE {page}
              </div>
              <button 
                onClick={() => setPage(page + 1)}
                disabled={txs.length < 25}
                className="p-2 rounded bg-[#1a1e24] border border-[#2a2f3a] text-gray-500 hover:text-white disabled:opacity-30 transition-all shadow-inner"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />

      <style jsx global>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 3s linear infinite;
        }
      `}</style>
    </div>
  );
}
