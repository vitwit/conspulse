'use client';
import React from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { timeDifference } from '../../utils';

interface Validator {
    address: string;
    voting_power: number;
}

function parseVoteTime(vote: string) {
    const match = vote.match(/@ ([^}]+)}/);
    return match ? match[1] : null;
}

interface Props {
    validators: Validator[];
    lastCommitVotes: string[];
    lastCommitBitArray: string | null;
    totalVotingPower: number;
    roundStartTime: Date;
}

const LastBlockConsensusTab: React.FC<Props> = ({
    validators,
    lastCommitVotes,
    lastCommitBitArray,
    totalVotingPower,
}) => {
    return (
        <div className="card overflow-x-auto scrollbar-hide">
            <table className="tbl">
                <thead>
                    <tr>
                        {['#', 'Validator Address', 'Voted', 'Vote Time', 'Voting Power', 'Voting Power %', 'Vote String'].map(
                            (label, i) => (
                                <th key={i}>{label}</th>
                            )
                        )}
                    </tr>
                </thead>
                <tbody>
                    {validators.length === 0 ? (
                        <tr>
                            <td colSpan={7} className="text-center py-10 text-slate-500">
                                No validators found.
                            </td>
                        </tr>
                    ) : (
                        validators.map((v: any, idx: number) => {
                            const vote = lastCommitVotes[idx];
                            const voted = vote && typeof vote === 'string' && !vote.startsWith('nil');
                            const voteTimeStr = voted ? parseVoteTime(vote) : null;
                            const voteTime = voteTimeStr ? new Date(voteTimeStr) : null;
                            const votingPower = Number(v.voting_power);
                            const votingPowerPercent = totalVotingPower
                                ? ((votingPower / totalVotingPower) * 100).toFixed(2)
                                : '0.00';

                            return (
                                <tr key={`${v.address}-${idx}`} className={voted ? 'bg-emerald-400/[0.03]' : 'bg-rose-400/[0.04]'}>
                                    <td className="font-mono text-slate-500">{idx}</td>
                                    <td className="font-mono text-slate-200 break-all">{v.address}</td>
                                    <td>
                                        {voted ? (
                                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">
                                                <CheckCircle2 size={12} /> Voted
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-400/10 px-2 py-0.5 text-[11px] font-semibold text-rose-400">
                                                <XCircle size={12} /> Missed
                                            </span>
                                        )}
                                    </td>
                                    <td className="font-mono">{voteTime ? timeDifference(new Date(), voteTime) : '—'}</td>
                                    <td className="font-mono">{votingPower.toLocaleString()}</td>
                                    <td>
                                        <div className="flex items-center gap-2">
                                            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/[0.06]">
                                                <div
                                                    className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400"
                                                    style={{ width: `${Math.min(100, Number(votingPowerPercent) * 4)}%` }}
                                                />
                                            </div>
                                            <span className="font-mono text-xs">{votingPowerPercent}%</span>
                                        </div>
                                    </td>
                                    <td className="font-mono max-w-[420px] truncate text-slate-500" title={vote || undefined}>
                                        {vote || '—'}
                                    </td>
                                </tr>
                            );
                        })
                    )}
                    {lastCommitBitArray && (
                        <tr>
                            <td className="font-bold text-slate-300">BitArray</td>
                            <td className="font-mono text-slate-500" colSpan={6}>
                                {lastCommitBitArray}
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default LastBlockConsensusTab;
