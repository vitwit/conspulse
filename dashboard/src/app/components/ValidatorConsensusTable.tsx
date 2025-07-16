import React from "react";
import { timeAgo } from "../utils";
import CopyButton from "./CopyButton";

function parseVoteTime(vote: string) {
    const match = vote.match(/@ ([^}]+)}/);
    return match ? match[1] : null;
}

interface Validator {
    address: string;
    voting_power: number | string;
}

interface ValidatorsConsensusTableProps {
    validators: Validator[];
    lastCommitVotes: (string | null)[];
    totalVotingPower: number;
    lastCommitBitArray?: string;
}

const ValidatorsConsensusTable: React.FC<ValidatorsConsensusTableProps> = ({
    validators,
    lastCommitVotes,
    totalVotingPower,
    lastCommitBitArray,
}) => {
    const now = new Date();

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left text-gray-300 bg-[#1a1e24] border border-[#2a2f3a] rounded-lg shadow-md">
                <thead className="bg-[#2a2f3a] text-cyan-300 text-xs uppercase tracking-wider">
                    <tr>
                        {[
                            "#",
                            "Validator Address",
                            "Voted",
                            "Vote Time",
                            "Voting Power",
                            "Voting Power %",
                            "Vote String",
                        ].map((label, i) => (
                            <th key={i} className="px-4 py-3 whitespace-nowrap">
                                {label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {validators.length === 0 ? (
                        <tr>
                            <td colSpan={7} className="text-center py-6 text-gray-500">
                                No validators found.
                            </td>
                        </tr>
                    ) : (
                        validators.map((v: Validator, idx: number) => {
                            const vote = lastCommitVotes[idx];
                            const voted =
                                vote && typeof vote === "string" && !vote.startsWith("nil");
                            const voteTimeStr = voted ? parseVoteTime(vote) : null;
                            const voteTime = voteTimeStr ? new Date(voteTimeStr) : null;
                            const votingPower = Number(v.voting_power);
                            const votingPowerPercent = totalVotingPower
                                ? ((votingPower / totalVotingPower) * 100).toFixed(2)
                                : "0.00";

                            return (
                                <tr
                                    key={v.address}
                                    className={
                                        voted ? "bg-green-900/20" : "bg-red-900/20"
                                    }
                                >
                                    <td className="px-4 py-2 font-mono text-gray-200">{idx}</td>
                                    <td className="px-4 py-2 font-mono text-gray-200 break-all">
                                        <span className="flex items-center gap-1">
                                            {v.address}
                                            <CopyButton value={v.address} size="sm" />
                                        </span>
                                    </td>
                                    <td className="px-4 py-2 font-mono">
                                        {voted ? "✅" : "❌"}
                                    </td>
                                    <td className="px-4 py-2 font-mono">
                                        {voteTime ? timeAgo(voteTime, Date.now()) : "—"}
                                    </td>
                                    <td className="px-4 py-2 font-mono">{votingPower}</td>
                                    <td className="px-4 py-2 font-mono">
                                        {votingPowerPercent}%
                                    </td>
                                    <td className="px-4 py-2 font-mono break-all">
                                        {vote || "—"}
                                    </td>
                                </tr>
                            );
                        })
                    )}

                    {lastCommitBitArray && (
                        <tr>
                            <td className="px-4 py-2 font-bold text-gray-300">BitArray</td>
                            <td
                                className="px-4 py-2 font-mono text-gray-400"
                                colSpan={6}
                            >
                                {lastCommitBitArray}
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default ValidatorsConsensusTable;
