"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import { 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Database, 
  Hash, 
  Layers, 
  User, 
  Zap,
  CheckCircle2,
  Info,
  Shield,
  Activity,
} from "lucide-react";
import moment from "moment";
import ShortName from "../../components/ShortName";
import ShortProposerName from "../../components/ShortProposer";
import JsonViewer from "../../components/JsonViewer";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

type Tab = "transactions" | "protocol" | "votes" | "side_tx" | "events" | "json";

export default function BlockDetailPage() {
  const { height } = useParams();
  const router = useRouter();
  const [block, setBlock] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [txLoading, setTxLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("transactions");

  useEffect(() => {
    async function fetchBlock() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_URL}/blocks/${height}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setBlock(data.block);
        
        // Fetch Dependent Data
        fetchTransactions();
      } catch (err: any) {
        setError(err.message || "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    async function fetchTransactions() {
        setTxLoading(true);
        try {
            // Workaround: the backend doesn't support fetching transactions by block height,
            // so we fetch the most recent 250 transactions and filter by height.
            const res = await fetch(`${API_URL}/txs?page=1&limit=2`);
            if (res.ok) {
                const data = await res.json();
                const filteredTxs = (data.txs || []).filter((tx: any) => tx.height === Number(height));
                setTransactions(filteredTxs);
            }
        } catch (err) {
            console.error("Failed to fetch block transactions", err);
        } finally {
            setTxLoading(false);
        }
    }

    if (height) fetchBlock();
  }, [height]);

  const goToBlock = (h: number) => {
    router.push(`/blocks/${h}`);
  };

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
          <div className="w-12 h-12 border-4 border-green-500/20 border-t-green-500 rounded-full animate-spin"></div>
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
        {/* Breadcrumbs & Navigation */}
        <div className="flex items-center justify-between mb-8">
           <div className="flex items-center gap-2 text-sm">
             <span className="text-gray-500">Explorers</span>
             <span className="text-gray-700">/</span>
             <span className="text-gray-500 cursor-pointer hover:text-gray-300" onClick={() => router.push("/blocks")}>Blocks</span>
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

        {/* Block Hero Section */}
        <div className="bg-[#1a1e24] rounded-xl border border-[#2a2f3a] p-6 mb-8 overflow-hidden relative">
           <div className="absolute top-0 right-0 p-8 opacity-5">
             <Layers size={120} />
           </div>
           
           <h2 className="text-xl font-bold text-white mb-6">Block Information</h2>
           
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-6 gap-x-12">
             <InfoItem label="Chain ID" value={blockData.chain_id} icon={<Database size={16} />} />
             <InfoItem label="Height" value={blockData.height.toLocaleString()} icon={<Layers size={16} />} isMono />
             <InfoItem label="Block Hash" value={blockData.data_hash} icon={<Hash size={16} />} isShortened />
             <InfoItem label="App Hash" value={blockData.app_hash} icon={<Hash size={16} />} isShortened isMono />
             <InfoItem label="Time (UTC)" value={`${moment(blockData.time).format("MMM Do, YYYY HH:mm:ss")} (UTC)`} icon={<Clock size={16} />} />
             <InfoItem label="Proposer" value={blockData.proposer_address} icon={<User size={16} />} isProposer />
             <InfoItem label="TX Count" value={blockData.transactions} icon={<Zap size={16} />} />
           </div>

           {/* Heimdall Specific Section */}
           {blockData.block_tx && (
             <div className="mt-8 pt-8 border-t border-[#2a2f3a]">
               <h3 className="text-sm font-semibold text-blue-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                 <CheckCircle2 size={16} /> Heimdall Sidechain TX
               </h3>
               <div className="bg-[#13161c] p-4 rounded-lg border border-blue-900/30">
                 <div className="flex flex-col gap-2">
                   <div className="flex items-center justify-between text-sm">
                     <span className="text-gray-500 font-medium">Block TX Hash</span>
                     <span className="text-blue-200 font-mono">{blockData.block_tx}</span>
                   </div>
                 </div>
               </div>
             </div>
           )}
        </div>

        {/* Tabs Section */}
        <div className="mt-8 border-b border-[#2a2f3a] flex gap-8">
           <TabItem 
            label="Transactions" 
            active={activeTab === "transactions"} 
            onClick={() => setActiveTab("transactions")} 
            count={blockData.transactions}
           />
           <TabItem 
            label="Protocol" 
            active={activeTab === "protocol"} 
            onClick={() => setActiveTab("protocol")} 
            count={(blockData.consensus_param_updates ? 1 : 0) + (blockData.validator_updates ? 1 : 0)}
           />
           <TabItem 
            label="Side Txs" 
            active={activeTab === "side_tx"} 
            onClick={() => setActiveTab("side_tx")} 
           />
           <TabItem 
            label="Block Events" 
            active={activeTab === "events"} 
            onClick={() => setActiveTab("events")} 
           />
           <TabItem 
            label="Raw JSON" 
            active={activeTab === "json"} 
            onClick={() => setActiveTab("json")} 
           />
        </div>

        {/* Tab Content */}
        <div className="py-8 min-h-[400px]">
           {activeTab === "transactions" && (
             <div className="bg-[#1a1e24] rounded-lg border border-[#2a2f3a] overflow-hidden">
                {txLoading ? (
                  <div className="py-20 flex justify-center">
                    <div className="w-8 h-8 border-2 border-green-500/20 border-t-green-500 rounded-full animate-spin"></div>
                  </div>
                ) : transactions.length === 0 ? (
                  <div className="py-20 text-center text-gray-500 italic font-mono text-sm">
                    No transactions found at this height.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-xs text-left">
                      <thead className="bg-[#1a1e24] text-zinc-500 uppercase tracking-wider font-semibold">
                        <tr>
                          <th className="px-6 py-4 border-b border-[#2a2f3a]">TX Hash</th>
                          <th className="px-6 py-4 border-b border-[#2a2f3a]">Status</th>
                          <th className="px-6 py-4 border-b border-[#2a2f3a]">Messages</th>
                          <th className="px-6 py-4 border-b border-[#2a2f3a]">Memo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#2a2f3a]">
                        {transactions.map((tx: any, idx: number) => (
                          <tr key={idx} className="hover:bg-white/5 transition-colors cursor-pointer" onClick={() => router.push(`/tx/${tx.hash}`)}>
                            <td className="px-6 py-4">
                               <div className="flex items-center gap-2">
                                  <span className="text-blue-400 font-mono"><ShortName value={tx.hash} maxLength={20} /></span>
                               </div>
                            </td>
                            <td className="px-6 py-4">
                               <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                                 // Some transactions might not have success field yet if indexed by old logic
                                 tx.raw_log?.toLowerCase().includes('error') ? "bg-red-500/20 text-red-400" : "bg-green-500/20 text-green-400"
                               }`}>
                                 {tx.raw_log?.toLowerCase().includes('error') ? "FAILED" : "SUCCESS"}
                               </span>
                            </td>
                            <td className="px-6 py-4">
                               <div className="flex flex-wrap gap-1">
                                  {(tx.messages || []).map((msg: any, mIdx: number) => (
                                    <span key={mIdx} className="bg-[#2a2f3a] px-2 py-0.5 rounded text-[10px] text-gray-300">
                                      {msg.typeUrl?.split('.').pop() || "Unknown"}
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

           {activeTab === "protocol" && (
             <div className="space-y-8">
               {/* Consensus Updates */}
               <div className="bg-[#1a1e24] rounded-lg border border-[#2a2f3a] overflow-hidden">
                 <div className="bg-[#21262d] px-6 py-4 border-b border-[#2a2f3a] flex items-center justify-between">
                    <h3 className="text-sm font-bold text-blue-400 uppercase tracking-widest flex items-center gap-2">
                      <Shield size={16} /> Consensus Parameter Updates
                    </h3>
                 </div>
                 <div className="p-6">
                    {blockData.consensus_param_updates ? (
                      <JsonViewer data={blockData.consensus_param_updates} initialExpanded={true} />
                    ) : (
                      <div className="text-gray-600 italic text-sm py-4">No consensus parameter updates at this height.</div>
                    )}
                 </div>
               </div>

               {/* Validator Updates */}
               <div className="bg-[#1a1e24] rounded-lg border border-[#2a2f3a] overflow-hidden">
                 <div className="bg-[#21262d] px-6 py-4 border-b border-[#2a2f3a] flex items-center justify-between">
                    <h3 className="text-sm font-bold text-purple-400 uppercase tracking-widest flex items-center gap-2">
                      <Activity size={16} /> Validator Set Updates
                    </h3>
                 </div>
                 <div className="p-6">
                    {blockData.validator_updates && blockData.validator_updates.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-xs text-left">
                          <thead className="text-zinc-500 uppercase font-semibold">
                            <tr>
                              <th className="pb-4 pr-6">Validator Address</th>
                              <th className="pb-4 px-6">Pubkey</th>
                              <th className="pb-4 pl-6 text-right">New Voting Power</th>
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
                      </div>
                    ) : (
                      <div className="text-gray-600 italic text-sm py-4">No validator set changes at this height.</div>
                    )}
                 </div>
               </div>
             </div>
           )}


           {activeTab === "side_tx" && (
             <div className="space-y-8">
               <div className="bg-[#1a1e24] rounded-lg border border-[#2a2f3a] overflow-hidden">
                 <div className="bg-[#21262d] px-6 py-4 border-b border-[#2a2f3a] flex items-center justify-between">
                    <h3 className="text-sm font-bold text-blue-400 uppercase tracking-widest flex items-center gap-2">
                      <CheckCircle2 size={16} /> Side Tx Commits
                    </h3>
                 </div>
                 <div className="p-6">
                    {blockData.sidetx_commits ? (
                      <JsonViewer data={blockData.sidetx_commits} initialExpanded={true} />
                    ) : (
                      <div className="text-gray-600 italic text-sm py-4">No side tx commits at this height.</div>
                    )}
                 </div>
               </div>

               <div className="bg-[#1a1e24] rounded-lg border border-[#2a2f3a] overflow-hidden">
                 <div className="bg-[#21262d] px-6 py-4 border-b border-[#2a2f3a] flex items-center justify-between">
                    <h3 className="text-sm font-bold text-purple-400 uppercase tracking-widest flex items-center gap-2">
                       <Activity size={16} /> Side Tx Summary
                    </h3>
                 </div>
                 <div className="p-6">
                    {blockData.sidetx_summary ? (
                      <JsonViewer data={blockData.sidetx_summary} initialExpanded={true} />
                    ) : (
                      <div className="text-gray-600 italic text-sm py-4">No side tx summary at this height.</div>
                    )}
                 </div>
               </div>
             </div>
           )}
           
           {activeTab === "events" && (
             <div className="bg-[#1a1e24] rounded-lg border border-[#2a2f3a] p-6 overflow-x-auto">
                <JsonViewer data={blockData.result_finalize_block} initialExpanded={false} />
             </div>
           )}

           {activeTab === "json" && (
             <div className="bg-[#1a1e24] rounded-lg border border-[#2a2f3a] p-6 overflow-x-auto relative text-zinc-300 text-xs font-mono leading-relaxed">
                <JsonViewer data={blockData} initialExpanded={false} />
             </div>
           )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
}

function InfoItem({ label, value, icon, isMono = false, isShortened = false, isProposer = false }: any) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2 text-gray-500 text-xs font-semibold uppercase tracking-wider">
        {icon}
        {label}
      </div>
      <div className={`text-white ${isMono ? "font-mono" : ""} text-sm`}>
        {isShortened ? (
          <div className="flex items-center gap-2">
            <ShortName value={value} maxLength={24} />
          </div>
        ) : isProposer ? (
          <ShortProposerName value={value} maxLength={20} />
        ) : (
          value
        )}
      </div>
    </div>
  );
}

function TabItem({ label, active, onClick, count }: any) {
  return (
    <button
      onClick={onClick}
      className={`pb-4 px-2 text-sm font-bold transition-all border-b-2 hover:cursor-pointer whitespace-nowrap ${
        active 
          ? "border-green-400 text-green-400" 
          : "border-transparent text-gray-500 hover:text-gray-300"
      }`}
    >
      <div className="flex items-center gap-2">
        {label}
        {count !== undefined && (
          <span className={`px-1.5 py-0.5 rounded text-[10px] ${active ? "bg-green-400/20" : "bg-gray-800"}`}>
            {count}
          </span>
        )}
      </div>
    </button>
  );
}
