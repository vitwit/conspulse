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
}

interface BlocksTableProps {
  blocks: Block[];
}

// Shorten address without any API call
function shortAddress(address: string, chars = 8): string {
  if (!address) return "—";
  return `${address.substring(0, chars)}...${address.substring(address.length - 4)}`;
}

// Stable pastel gradient per proposer address
const AVATAR_GRADIENTS = [
  "from-cyan-500 to-blue-500",
  "from-emerald-500 to-teal-500",
  "from-violet-500 to-purple-500",
  "from-amber-500 to-orange-500",
  "from-pink-500 to-rose-500",
  "from-sky-500 to-indigo-500",
];

function avatarGradient(address: string) {
  let hash = 0;
  for (let i = 0; i < address.length; i++) hash = (hash * 31 + address.charCodeAt(i)) >>> 0;
  return AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length];
}

const BlocksTable: React.FC<BlocksTableProps> = ({ blocks }) => {
  return (
    <div className="card overflow-x-auto">
      <table className="tbl">
        <thead>
          <tr>
            <th>Height</th>
            <th>Block Hash</th>
            <th>Proposer</th>
            <th>TX Count</th>
            <th className="!text-right">Created At</th>
          </tr>
        </thead>
        <tbody>
          {blocks.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-6 py-10 text-center text-slate-500">
                No blocks found
              </td>
            </tr>
          ) : (
            blocks.map((block) => (
              <tr key={block.height} className="group">
                <td>
                  <Link
                    href={`/blocks/${block.height}`}
                    prefetch={false}
                    className="font-mono font-bold text-emerald-400 transition-colors hover:text-emerald-300 hover:underline underline-offset-4"
                  >
                    {block.height.toLocaleString()}
                  </Link>
                </td>
                <td className="font-mono">
                  <ShortName value={block.data_hash} maxLength={12} />
                </td>
                <td>
                  <div className="flex items-center gap-2.5">
                    <div className={`flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br ${avatarGradient(block.proposer_address)} text-[10px] font-bold text-white shadow-md`}>
                      {block.proposer_address.substring(0, 2).toUpperCase()}
                    </div>
                    <span className="font-mono text-xs text-slate-300">
                      {shortAddress(block.proposer_address)}
                    </span>
                  </div>
                </td>
                <td>
                  <span className={`inline-flex min-w-7 items-center justify-center rounded-md px-1.5 py-0.5 font-mono text-xs ${block.transactions > 0
                    ? "bg-cyan-400/10 text-cyan-300"
                    : "bg-white/[0.04] text-slate-500"
                    }`}>
                    {block.transactions}
                  </span>
                </td>
                <td className="!text-right">
                  <div className="flex flex-col items-end">
                    <span className="text-slate-300">
                      {moment.utc(block.time).local().format("MMM Do, YYYY")}
                    </span>
                    <span className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                      <Clock size={10} />
                      {moment.utc(block.time).local().format("HH:mm:ss")} ({moment.utc(block.time).local().fromNow()})
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
