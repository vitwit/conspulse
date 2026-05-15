"use client";

import React from "react";
import Link from "next/link";
import { Clock, Box } from "lucide-react";
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

function shortAddress(address: string, chars = 8): string {
  if (!address) return "—";
  return `${address.substring(0, chars)}…${address.substring(address.length - 4)}`;
}

const BlocksTable: React.FC<BlocksTableProps> = ({ blocks }) => {
  return (
    <div
      className="overflow-x-auto rounded-xl border"
      style={{
        background: "var(--bg-surface)",
        borderColor: "var(--border-default)",
      }}
    >
      <table className="min-w-full text-sm text-left">
        <thead>
          <tr
            style={{
              background: "var(--bg-elevated)",
              borderBottom: "1px solid var(--border-default)",
            }}
          >
            {["Height", "Block Hash", "Proposer", "TX Count", "Created At"].map((h, i) => (
              <th
                key={h}
                className={`px-6 py-3.5 text-xs font-semibold uppercase tracking-wider ${i === 4 ? "text-right" : ""}`}
                style={{ color: "var(--text-secondary)" }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {blocks.length === 0 ? (
            <tr>
              <td
                colSpan={5}
                className="px-6 py-16 text-center text-sm"
                style={{ color: "var(--text-muted)" }}
              >
                No blocks found
              </td>
            </tr>
          ) : (
            blocks.map((block, index) => (
              <tr
                key={block.height}
                className="group transition-colors"
                style={{
                  borderBottom: index < blocks.length - 1 ? "1px solid var(--border-subtle)" : "none",
                }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLElement).style.background = "var(--bg-elevated)")
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLElement).style.background = "transparent")
                }
              >
                {/* Height */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <Link
                    href={`/blocks/${block.height}`}
                    prefetch={false}
                    className="flex items-center gap-2 font-mono font-semibold text-sm transition-colors group-hover:underline"
                    style={{ color: "var(--accent-green)" }}
                  >
                    <Box size={14} style={{ color: "var(--accent-green)", opacity: 0.7 }} />
                    {block.height.toLocaleString()}
                  </Link>
                </td>

                {/* Block Hash */}
                <td
                  className="px-6 py-4 whitespace-nowrap font-mono text-xs"
                  style={{ color: "var(--text-secondary)" }}
                >
                  <ShortName value={block.data_hash} maxLength={12} />
                </td>

                {/* Proposer */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                      style={{
                        background: "linear-gradient(135deg, #388bfd 0%, #bc8cff 100%)",
                        color: "#fff",
                      }}
                    >
                      {block.proposer_address.substring(0, 2).toUpperCase()}
                    </div>
                    <span
                      className="font-mono text-xs"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {shortAddress(block.proposer_address)}
                    </span>
                  </div>
                </td>

                {/* TX Count */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className="inline-flex items-center gap-1.5 font-mono text-xs px-2.5 py-1 rounded-md"
                    style={{
                      color: block.transactions > 0 ? "var(--accent-blue)" : "var(--text-muted)",
                      background: block.transactions > 0 ? "rgba(88,166,255,0.08)" : "var(--bg-elevated)",
                    }}
                  >
                    {block.transactions}
                  </span>
                </td>

                {/* Created At */}
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <div className="flex flex-col items-end gap-0.5">
                    <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>
                      {moment.utc(block.time).local().format("MMM Do, YYYY")}
                    </span>
                    <span
                      className="text-xs flex items-center gap-1"
                      style={{ color: "var(--text-muted)" }}
                    >
                      <Clock size={10} />
                      {moment.utc(block.time).local().format("HH:mm:ss")}{" "}
                      <span style={{ color: "var(--text-secondary)" }}>
                        ({moment.utc(block.time).local().fromNow()})
                      </span>
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
