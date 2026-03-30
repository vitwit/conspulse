"use client";

import React from "react";
import Link from "next/link";
import { Clock } from "lucide-react";
import ShortName from "../components/ShortName";
import moment from "moment";

interface Block {
  height: number;
  time: string;
  chain_id: string;
  proposer_address: string;
  data_hash: string;
  transactions: number;
  sidetx_commits?: any;
  sidetx_summary?: any;
}

interface BlocksTableProps {
  blocks: Block[];
}

// Shorten address without any API call
function shortAddress(address: string, chars = 8): string {
  if (!address) return "—";
  return `${address.substring(0, chars)}...${address.substring(address.length - 4)}`;
}

const BlocksTable: React.FC<BlocksTableProps> = ({ blocks }) => {
  return (
    <div className="overflow-x-auto rounded-lg border border-[#2a2f3a] bg-[#1a1e24]">
      <table className="min-w-full text-sm text-left">
        <thead className="bg-[#2a2f3a] text-xs uppercase tracking-wider text-zinc-500">
          <tr>
            <th className="px-6 py-4 font-semibold">Height</th>
            <th className="px-6 py-4 font-semibold">Block Hash</th>
            <th className="px-6 py-4 font-semibold">Proposer</th>
            <th className="px-6 py-4 font-semibold">TX Count</th>
            <th className="px-6 py-4 font-semibold">Side TX</th>
            <th className="px-6 py-4 font-semibold text-right">Created At</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#2a2f3a]">
          {blocks.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                No blocks found
              </td>
            </tr>
          ) : (
            blocks.map((block) => (
              <tr key={block.height} className="hover:bg-[#232931] transition-colors group">
                <td className="px-6 py-4 whitespace-nowrap">
                  <Link
                    href={`/blocks/${block.height}`}
                    prefetch={false}
                    className="text-green-400 font-mono font-bold hover:underline"
                  >
                    {block.height.toLocaleString()}
                  </Link>
                </td>
                <td className="px-6 py-4 whitespace-nowrap font-mono text-gray-400">
                  <ShortName value={block.data_hash} maxLength={12} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-[10px] text-white font-bold">
                      {block.proposer_address.substring(0, 2).toUpperCase()}
                    </div>
                    <span className="text-gray-200 font-mono text-xs">
                      {shortAddress(block.proposer_address)}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-300 font-mono">
                  {block.transactions}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {block.sidetx_commits || block.sidetx_summary ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-500/20 text-blue-400 font-bold">
                      YES
                    </span>
                  ) : (
                    <span className="text-gray-600 text-[10px] font-bold">NO</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <div className="flex flex-col items-end">
                    <span className="text-gray-200">
                      {moment(block.time).format("MMM Do, YYYY")}
                    </span>
                    <span className="text-gray-500 text-xs flex items-center gap-1">
                      <Clock size={10} />
                      {moment(block.time).format("HH:mm:ss")} ({moment(block.time).fromNow()})
                    </span>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default BlocksTable;