"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import { 
  Hash, 
  Clock, 
  Layers, 
  User, 
  Zap,
  CheckCircle2,
  XCircle,
  FileJson,
  Activity,
  ArrowLeft,
  ChevronRight,
  Info
} from "lucide-react";
import moment from "moment";
import ShortName from "../../components/ShortName";
import JsonViewer from "../../components/JsonViewer";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

export default function TransactionDetailPage() {
  const { hash } = useParams();
  const router = useRouter();
  const [tx, setTx] = useState<any>(null);
  const [block, setBlock] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTx() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_URL}/txs/${hash}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const raw = data.tx;
        // Map DB fields to frontend-expected fields
        setTx({
          ...raw,
          hash: raw.txhash || raw.hash,
          success: raw.success !== undefined ? raw.success : !raw.raw_log?.toLowerCase().includes('error'),
          gas_used: raw.gas_used || 0,
          gas_wanted: raw.gas_wanted || 0,
        });

        // Fetch block for side tx commits
        if (raw.height) {
          fetch(`${API_URL}/blocks/${raw.height}`)
            .then(bRes => bRes.json())
            .then(bData => {
              if (bData.block) setBlock(bData.block);
            })
            .catch(e => console.error("Failed to fetch block for tx", e));
        }
      } catch (err: any) {
        setError(err.message || "Failed to load transaction");
      } finally {
        setLoading(false);
      }
    }

    if (hash) fetchTx();
  }, [hash]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0e1014] flex flex-col">
        <Navbar shrink={false} />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
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
          <p className="text-gray-400 text-sm">{error || "The requested transaction could not be found or decoded."}</p>
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

  return (
    <div className="min-h-screen bg-[#0e1014] flex flex-col font-sans">
      <Navbar shrink={false} />
      
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
        {/* Navigation / Breadcrumb */}
        <div className="flex items-center gap-4 mb-8">
           <button 
            onClick={() => router.back()}
            className="p-2 bg-[#1a1e24] border border-[#2a2f3a] rounded-lg text-gray-400 hover:text-white transition-all shadow-md"
           >
             <ArrowLeft size={18} />
           </button>
           <div className="flex items-center gap-2 text-sm">
             <span className="text-gray-500">Explorer</span>
             <ChevronRight size={14} className="text-gray-700" />
             <span className="text-gray-500 cursor-pointer hover:text-gray-300" onClick={() => router.push("/transactions")}>Transactions</span>
             <ChevronRight size={14} className="text-gray-700" />
             <span className="text-white font-mono text-xs">{tx.txhash}</span>
           </div>
        </div>

        {/* Status Hero Card */}
        <div className="bg-[#1a1e24] rounded-xl border border-[#2a2f3a] p-8 mb-8 relative overflow-hidden">
           <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
             <Hash size={140} />
           </div>
           
           <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
              <div className="space-y-2">
                 <div className="flex items-center gap-3">
                     <h2 className="text-white font-mono text-lg break-all select-all">{tx.hash}</h2>
                 </div>
                 <div className="flex items-center gap-4">
                    <span className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold ring-1 ${
                      isFailed 
                      ? "bg-red-500/10 text-red-400 ring-red-500/20" 
                      : "bg-green-500/10 text-green-400 ring-green-500/20"
                    }`}>
                      {isFailed ? <XCircle size={14} /> : <CheckCircle2 size={14} />}
                      {isFailed ? "FAILED" : "SUCCESSFUL"}
                    </span>
                    <div className="flex items-center gap-2 text-gray-400 text-sm">
                       <Clock size={14} />
                       {moment(tx.time).format("MMM Do, YYYY HH:mm:ss")} (UTC)
                    </div>
                 </div>
              </div>
              
              <div className="bg-black/20 backdrop-blur-sm p-4 rounded-xl border border-[#2a2f3a] flex gap-12">
                 <SummaryItem label="Height" value={tx.height.toLocaleString()} icon={<Layers size={14} />} />
                 <SummaryItem label="Messages" value={(tx.messages || []).length} icon={<Activity size={14} />} />
                 <SummaryItem label="Gas Used" value={tx.gas_used.toLocaleString()} icon={<Zap size={14} />} />
              </div>
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           {/* General / Performance Details */}
           <div className="lg:col-span-2 space-y-8">
              <div className="bg-[#1a1e24] rounded-xl border border-[#2a2f3a] overflow-hidden">
                 <div className="px-6 py-4 border-b border-[#2a2f3a] bg-[#1d2127]">
                    <h3 className="text-sm font-bold text-gray-300 uppercase tracking-widest flex items-center gap-2">
                      <Info size={16} /> Information
                    </h3>
                 </div>
                 <div className="p-6 divide-y divide-[#2a2f3a]">
                    <DetailRow label="Memo" value={tx.memo || "—"} />
                    <DetailRow label="Fee" value={tx.fee_amount || "0"} />
                    <DetailRow label="Gas (Wanted / Used)" value={`${(tx.gas_wanted || 0).toLocaleString()} / ${(tx.gas_used || 0).toLocaleString()}`} />
                 </div>
              </div>

               {block?.sidetx_commits && (
                 <div className="bg-[#1a1e24] rounded-xl border border-[#2a2f3a] overflow-hidden">
                    <div className="px-6 py-4 border-b border-[#2a2f3a] bg-[#1d2127]">
                       <h3 className="text-sm font-bold text-blue-400 uppercase tracking-widest flex items-center gap-2">
                         <CheckCircle2 size={16} /> Side Tx Commits
                       </h3>
                    </div>
                    <div className="p-6">
                       <JsonViewer data={block.sidetx_commits} initialExpanded={true} />
                    </div>
                 </div>
               )}

               {block?.sidetx_summary && (
                 <div className="bg-[#1a1e24] rounded-xl border border-[#2a2f3a] overflow-hidden">
                    <div className="px-6 py-4 border-b border-[#2a2f3a] bg-[#1d2127]">
                       <h3 className="text-sm font-bold text-purple-400 uppercase tracking-widest flex items-center gap-2">
                         <Activity size={16} /> Side Tx Summary
                       </h3>
                    </div>
                    <div className="p-6">
                       <JsonViewer data={block.sidetx_summary} initialExpanded={true} />
                    </div>
                 </div>
               )}

              {/* Messages Details */}
              <div className="bg-[#1a1e24] rounded-xl border border-[#2a2f3a] overflow-hidden">
                 <div className="px-6 py-4 border-b border-[#2a2f3a] bg-[#1d2127]">
                    <h3 className="text-sm font-bold text-blue-400 uppercase tracking-widest flex items-center gap-2">
                      <Activity size={16} /> Messages
                    </h3>
                 </div>
                 <div className="p-0">
                    {(tx.messages || []).map((msg: any, idx: number) => (
                      <div key={idx} className="border-b border-[#2a2f3a] last:border-b-0">
                        <div className="p-6">
                           <div className="flex items-center gap-3 mb-6">
                              <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold">
                                {idx + 1}
                              </span>
                              <span className="text-white font-bold text-sm tracking-wide bg-blue-500/10 px-3 py-1 rounded">
                                {msg.typeUrl?.split('.').pop() || "Unknown"}
                              </span>
                           </div>
                           <div className="bg-[#13161c] rounded-lg p-6 border border-[#2a2f3a]">
                              <JsonViewer data={msg} initialExpanded={true} />
                           </div>
                        </div>
                      </div>
                    ))}
                    {(!tx.messages || tx.messages.length === 0) && (
                      <div className="p-12 text-center text-gray-500 italic text-sm">
                        No messages found in this transaction.
                      </div>
                    )}
                 </div>
              </div>

              {/* Raw Log for debugging */}
              {isFailed && (
                <div className="bg-[#1a1e24] rounded-xl border border-red-900/30 overflow-hidden shadow-lg shadow-red-500/5">
                  <div className="px-6 py-4 border-b border-red-900/30 bg-red-500/5">
                      <h3 className="text-sm font-bold text-red-400 uppercase tracking-widest flex items-center gap-2">
                        <XCircle size={16} /> Error Log
                      </h3>
                  </div>
                  <div className="p-6 bg-red-950/10">
                      <pre className="text-red-300 font-mono text-xs leading-relaxed whitespace-pre-wrap">
                        {tx.raw_log}
                      </pre>
                  </div>
                </div>
              )}
           </div>

           {/* Sidebar: Raw Data / JSON */}
           <div className="space-y-8">
              <div className="bg-[#1a1e24] rounded-xl border border-[#2a2f3a] overflow-hidden sticky top-8">
                  <div className="px-6 py-4 border-b border-[#2a2f3a] bg-[#1d2127]">
                      <h3 className="text-sm font-bold text-gray-300 uppercase tracking-widest flex items-center gap-2">
                        <FileJson size={16} /> Raw JSON
                      </h3>
                  </div>
                  <div className="p-6 overflow-hidden">
                      <JsonViewer data={tx} initialExpanded={false} />
                  </div>
                  <div className="px-6 py-4 bg-black/20 border-t border-[#2a2f3a]">
                      <p className="text-[10px] text-gray-500 leading-tight italic">
                        Raw on-chain data including signatures, and ABCI events.
                      </p>
                  </div>
              </div>
           </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}

function SummaryItem({ label, value, icon }: any) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2 text-[#6e7681] text-[10px] font-bold uppercase tracking-wider">
        {icon}
        {label}
      </div>
      <div className="text-white text-sm font-mono font-bold">
        {value}
      </div>
    </div>
  );
}

function DetailRow({ label, value, isShortened = false }: any) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 py-4 gap-2">
       <div className="text-gray-500 text-xs font-semibold uppercase tracking-wider pt-0.5">
         {label}
       </div>
       <div className="md:col-span-3 text-gray-200 text-sm font-mono break-all leading-relaxed">
         {isShortened ? (
           <div className="flex items-center gap-2">
             <ShortName value={value} maxLength={40} />
             <span className="text-[10px] text-gray-600 italic">(Hex format)</span>
           </div>
         ) : (
           value
         )}
       </div>
    </div>
  );
}
