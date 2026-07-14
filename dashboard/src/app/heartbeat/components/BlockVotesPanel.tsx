"use client";

import React, { useMemo } from "react";

function parseBitArray(str: string) {
  const match = str.match(/BA\{(\d+):(.*?)\}/);
  if (!match) return { total: 0, bits: "" };
  return { total: Number(match[1]), bits: match[2] };
}

export function parseCommitBitArray(str: string) {
  const { bits, total } = parseBitArray(str);
  if (!bits || !total) return { percent: 0, voted: 0, total: 0 };
  const voted = bits.split("").filter((b) => b === "x").length;
  return {
    percent: Math.round((voted / total) * 100),
    voted,
    total,
  };
}

const RING_C = 2 * Math.PI * 42;

export function BlockVotesPanel({
  bitArray,
  validators,
  votesPercent,
}: {
  bitArray: string;
  validators?: { address?: string; voting_power?: string | number }[];
  votesPercent?: number;
}) {
  const { bits, total } = useMemo(() => parseBitArray(bitArray), [bitArray]);
  const voted = useMemo(() => bits.split("").filter((b) => b === "x").length, [bits]);
  const missed = total - voted;
  const percent = votesPercent ?? (total ? Math.round((voted / total) * 100) : 0);
  const ringOffset = RING_C - (percent / 100) * RING_C;

  if (!bits) return null;

  const quorumMet = percent >= 67;

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
      <div className="flex shrink-0 items-center gap-4">
        <div className="relative h-[88px] w-[88px]">
          <svg viewBox="0 0 96 96" className="h-full w-full -rotate-90">
            <circle cx="48" cy="48" r="42" fill="none" stroke="rgba(148,163,184,0.1)" strokeWidth="6" />
            <circle
              cx="48"
              cy="48"
              r="42"
              fill="none"
              stroke="url(#voteGrad)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={RING_C}
              strokeDashoffset={ringOffset}
              className="vote-ring-progress"
            />
            <defs>
              <linearGradient id="voteGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#22d3ee" />
                <stop offset="100%" stopColor="#34d399" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-mono font-bold text-white tabular-nums">{percent}%</span>
            <span className="text-[10px] uppercase tracking-wider text-slate-500">signed</span>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-mono font-bold text-emerald-400 tabular-nums">{voted}</span>
            <span className="text-sm text-slate-500">/ {total} validators</span>
          </div>
          {missed > 0 ? (
            <span className="text-xs text-rose-400/90">{missed} missed</span>
          ) : (
            <span className="text-xs text-emerald-400/80">All validators signed</span>
          )}
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
              quorumMet
                ? "bg-emerald-400/10 text-emerald-400 ring-1 ring-emerald-400/20"
                : "bg-amber-400/10 text-amber-400 ring-1 ring-amber-400/20"
            }`}
          >
            {quorumMet ? "Quorum met" : "Below quorum"}
          </span>
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <div
          className="grid w-full gap-[2px]"
          style={{ gridTemplateColumns: `repeat(${Math.min(bits.length, 102)}, minmax(0, 1fr))` }}
        >
          {bits.split("").map((b, i) => {
            const isVoted = b === "x";
            const address = validators?.[i]?.address;
            return (
              <div
                key={i}
                title={address ? `${address}${isVoted ? " · signed" : " · missed"}` : `Validator ${i}`}
                className={`vote-bar h-7 min-w-0 cursor-pointer rounded-[2px] ${
                  isVoted ? "vote-bar-signed" : "vote-bar-missed"
                }`}
              />
            );
          })}
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="vote-progress h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    </div>
  );
}
