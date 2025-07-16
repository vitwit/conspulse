import React from "react";

interface Vote {
    round?: number;
    prevotes_bit_array?: string;
    precommits_bit_array?: string;
}

interface VotesByRoundTableProps {
    votes: Vote[];
}

const VotesByRoundTable: React.FC<VotesByRoundTableProps> = ({ votes }) => {
    if (!Array.isArray(votes) || votes.length === 0) return null;

    return (
        <div className="bg-[#1a1e24] rounded-lg p-4 shadow-inner mt-8 border border-[#2a2f3a]">
            <h3 className="text-lg font-semibold mb-4 text-cyan-300">Votes by Round</h3>
            <div className="overflow-x-auto">
                <table className="min-w-full text-xs text-gray-300 border border-[#2a2f3a] rounded">
                    <thead className="bg-[#2a2f3a] text-cyan-400 uppercase tracking-wider">
                        <tr>
                            <th className="px-4 py-2 text-left">Round</th>
                            <th className="px-4 py-2 text-left">Prevotes Bit Array</th>
                            <th className="px-4 py-2 text-left">Precommits Bit Array</th>
                        </tr>
                    </thead>
                    <tbody>
                        {votes.map((vote, idx) => (
                            <tr key={idx} className="border-b border-[#2a2f3a]">
                                <td className="px-4 py-2 font-mono">{vote.round ?? idx}</td>
                                <td className="px-4 py-2 font-mono break-all text-gray-100">
                                    {vote.prevotes_bit_array || "—"}
                                </td>
                                <td className="px-4 py-2 font-mono break-all text-gray-100">
                                    {vote.precommits_bit_array || "—"}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default VotesByRoundTable;
