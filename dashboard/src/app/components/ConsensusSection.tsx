import React from "react";
import CopyButton from "./CopyButton";
import VotesByRoundTable from "./VotesByRoundTable";

interface ConsensusSectionProps {
    height: number | null;
    round: number | null;
    prevotes: number;
    precommits: number;
    chainId: string;
    proposer: string;
    dumpConsensus: any;
    dumpLoading: boolean;
    dumpError: string | null;
}

const ConsensusSection: React.FC<ConsensusSectionProps> = ({
    height,
    round,
    prevotes,
    precommits,
    chainId,
    proposer,
    dumpConsensus,
    dumpLoading,
    dumpError,
}) => {
    const stepLabels = [
        { label: "Propose", percent: 0 },
        { label: "Prevote", percent: 33 },
        { label: "Precommit", percent: 66 },
        { label: "Commit", percent: 100 },
    ];

    const progressFill = precommits;
    const currentStep =
        progressFill < 33
            ? "Propose"
            : progressFill < 66
                ? "Prevote"
                : progressFill < 100
                    ? "Precommit"
                    : "Commit";

    const proposerAddr =
        dumpConsensus?.result?.round_state?.proposer?.address || null;
    const proposerObj = dumpConsensus?.result?.round_state?.validators?.validators?.find(
        (v: any) => v.address === proposerAddr
    );
    const blockProposerAddr =
        dumpConsensus?.result?.round_state?.proposal_block?.header?.proposer_address;

    const lastBlockTime =
        dumpConsensus?.result?.round_state?.proposal_block?.header?.time;

    return (
        <section className="p-4 sm:p-8 bg-[#1a1e24] rounded-xl shadow-xl text-gray-200">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-cyan-300 mb-2">Consensus Progress for Current Block {height ?? '-'}</h2>
            </div>

            <div className="mb-8">
                <div className="w-full relative h-5">
                    <div className="absolute top-0 left-0 h-3 w-full bg-gray-700 rounded-full" />
                    <div
                        className="absolute top-0 left-0 h-3 rounded-full bg-gradient-to-r from-cyan-500 to-violet-500 transition-all duration-700"
                        style={{ width: `${progressFill}%` }}
                    />
                    <div className="absolute w-full flex justify-between text-xs mt-2 text-gray-400">
                        {stepLabels.map((step) => (
                            <span
                                key={step.label}
                                className={
                                    progressFill >= step.percent
                                        ? "font-bold text-cyan-300"
                                        : "text-gray-500"
                                }
                            >
                                {step.label}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            {/* Metrics Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-[#2a2f3a] p-4 rounded shadow text-center">
                    <div className="text-gray-400 text-sm">Height</div>
                    <div className="text-white font-mono text-xl">{height ?? "—"}</div>
                </div>
                <div className="bg-[#2a2f3a] p-4 rounded shadow text-center">
                    <div className="text-gray-400 text-sm">Round</div>
                    <div className="text-white font-mono text-xl">{round ?? "—"}</div>
                </div>
                <div className="bg-[#2a2f3a] p-4 rounded shadow text-center">
                    <div className="text-gray-400 text-sm">Pre-votes</div>
                    <div className="text-yellow-300 font-mono text-xl">{prevotes}%</div>
                </div>
                <div className="bg-[#2a2f3a] p-4 rounded shadow text-center">
                    <div className="text-gray-400 text-sm">Pre-commits</div>
                    <div className="text-purple-300 font-mono text-xl">{precommits}%</div>
                </div>
            </div>

            {/* Proposer Section */}
            <div className="bg-[#232730] rounded-lg p-4 mb-8 border border-[#2a2f3a]">
                <h3 className="text-lg text-cyan-300 font-semibold mb-2">Proposer</h3>
                <div className="text-sm text-gray-400">Address</div>
                <div className="flex items-center gap-2 font-mono text-gray-100 mb-2">
                    {proposer || "—"} {proposer && <CopyButton value={proposer} />}
                </div>
                {proposerAddr && (
                    <>
                        <div className="text-sm text-gray-400">Proposer Address</div>
                        <div className="flex items-center gap-2 font-mono text-gray-100 mb-2">
                            {proposerAddr} <CopyButton value={proposerAddr} />
                        </div>
                    </>
                )}
                {blockProposerAddr && (
                    <>
                        <div className="text-sm text-gray-400">Block Proposer Address</div>
                        <div className="flex items-center gap-2 font-mono text-gray-100 mb-2">
                            {blockProposerAddr} <CopyButton value={blockProposerAddr} />
                        </div>
                    </>
                )}
                {proposerObj?.voting_power && (
                    <div className="text-sm text-gray-400">Voting Power</div>
                )}
                {proposerObj?.voting_power && (
                    <div className="font-mono text-gray-100 mb-1">
                        {proposerObj.voting_power}
                    </div>
                )}
                {proposerObj?.proposer_priority && (
                    <div className="text-sm text-gray-400">Proposer Priority</div>
                )}
                {proposerObj?.proposer_priority && (
                    <div className="font-mono text-gray-100">
                        {proposerObj.proposer_priority}
                    </div>
                )}
            </div>

            {/* Last Block Time */}
            <div className="mb-8 text-sm text-gray-400">
                Last Block:{" "}
                <span className="font-mono text-white">
                    {lastBlockTime ? lastBlockTime : "—"}
                </span>
            </div>

            {/* Validators Table */}
            {/* <ValidatorsConsensusTable
                round={round}
                dumpConsensus={dumpConsensus}
            /> */}

            {/* Votes by Round */}
            {dumpLoading ? (
                <div className="text-yellow-400 mt-4">Loading votes by round…</div>
            ) : dumpError ? (
                <div className="text-red-400 mt-4">Error: {dumpError}</div>
            ) : (
                <VotesByRoundTable votes={dumpConsensus?.result?.round_state?.votes || []} />
            )}
        </section>
    );
};

export default ConsensusSection;
