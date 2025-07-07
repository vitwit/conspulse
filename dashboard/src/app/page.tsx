"use client";
import React, { useEffect, useState, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import { useTendermint } from "./context/TendermintListener";

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL;
const NETWORK_NAME = process.env.NEXT_PUBLIC_NETWORK_NAME || "";

console.log('RPC_URL', RPC_URL);

function parseHeightRoundStep(str: string) {
  const [height, round] = str.split("/");
  return { height: Number(height), round: Number(round) };
}

function parseBitArray(str: string) {
  // Example: BA{21:x_x_xxxxxx________x__} 137002711/192368453 = 0.71
  const match = str.match(/([\d]+)\/([\d]+)\s*=\s*([\d.]+)/);
  if (!match) return { percent: 0 };
  return { percent: Math.round(Number(match[3]) * 100) };
}

function timeAgo(date: Date | null) {
  if (!date) return "";
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

// Add a CopyButton component
function CopyButton({ value, className = "" }: { value: string, className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <span className={"inline-flex items-center gap-1 " + className}>
      <button
        type="button"
        aria-label="Copy to clipboard"
        title={copied ? "Copied!" : "Copy"}
        onClick={() => {
          navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        }}
        className="ml-1 p-1 rounded hover:bg-gray-200 focus:outline-none"
        tabIndex={0}
      >
        {/* Simple copy SVG icon */}
        <svg width="16" height="16" fill="none" viewBox="0 0 20 20"><rect x="6" y="6" width="9" height="9" rx="2" stroke="#555" strokeWidth="1.5" /><rect x="3" y="3" width="9" height="9" rx="2" stroke="#bbb" strokeWidth="1.5" /></svg>
      </button>
      {copied && <span className="text-xs text-green-600">Copied!</span>}
    </span>
  );
}

export default function Home() {
  const [consensus, setConsensus] = useState<{
    "height/round/step"?: string;
    height_vote_set?: Array<{
      round: number;
      prevotes: string[];
      precommits: string[];
      prevotes_bit_array: string;
      precommits_bit_array: string;
    }>;
    proposer?: { address: string };
    start_time?: string;
  } | null>(null);
  const [validators, setValidators] = useState<{ address: string; voting_power: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingValidators, setLoadingValidators] = useState(true);
  const [timer, setTimer] = useState(1);
  const [activeMenu, setActiveMenu] = useState("consensus");
  const [favourites, setFavourites] = useState<string[]>([]);
  const [sortByPower, setSortByPower] = useState<"desc" | "asc">("desc");
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);
  const [lastBlockTime, setLastBlockTime] = useState<Date | null>(null);
  const [proposer, setProposer] = useState<string | null>(null);
  const [blockStartTime, setBlockStartTime] = useState<Date | null>(null);
  const [prevConsensus, setPrevConsensus] = useState<any>(null);
  const [prevHeight, setPrevHeight] = useState<number | null>(null);
  const [blockFlash, setBlockFlash] = useState(false);
  const firstLoad = useRef(true);
  const [progressFill, setProgressFill] = useState(0);
  const prevProgressRef = useRef(0);
  const pathname = usePathname();
  const [dumpConsensus, setDumpConsensus] = useState<any>(null);
  const [dumpLoading, setDumpLoading] = useState(false);
  const [dumpError, setDumpError] = useState<string | null>(null);

  const event = useTendermint();
  const [currentStep, setCurrentStep] = useState<string>("");
  const [height, setHeight] = useState<number>(0);
  const [round, setRound] = useState<number>(0);

  useEffect(() => {
    if (!event) return;

    switch (event.step) {
      case "NewHeight":
        setProgressFill(25);
        break;
      case "Propose":
        setTimeout(() => {
          setProgressFill(50);
        }, 250)
        break;
      case "Prevote":
        setTimeout(() => {
          setProgressFill(75);
        }, 400)
        break;
      case "Commit":
        setTimeout(() => {
          setProgressFill(100);
        }, 500)
        break;
      case "NewBlock":
        // fetchData();
      break;
    }

    if (height < event.height) {
      setTimeout(() => {
        setProgressFill(0);
      }, 1000)
      setHeight(event.height);
      setRound(event.round);
      setBlockFlash(true);
      setTimeout(() => setBlockFlash(false), 200);
    }

  }, [event]);


  // Load favourites from localStorage
  useEffect(() => {
    const favs = localStorage.getItem("favourite_validators");
    if (favs) setFavourites(JSON.parse(favs));
  }, []);

  // Save favourites to localStorage
  useEffect(() => {
    localStorage.setItem("favourite_validators", JSON.stringify(favourites));
  }, [favourites]);

  const toggleFavourite = useCallback((address: string) => {
    setFavourites((prev) =>
      prev.includes(address)
        ? prev.filter((a) => a !== address)
        : [...prev, address]
    );
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setLoadingValidators(true);
    try {
      const consensusRes = await fetch(`${RPC_URL}/consensus_state`);
      const consensusData = await consensusRes.json();
      setConsensus(consensusData.result.round_state);
      setProposer(consensusData.result.round_state.proposer?.address || null);
      setBlockStartTime(consensusData.result.round_state.start_time ? new Date(consensusData.result.round_state.start_time) : null);
      const { height } = parseHeightRoundStep(consensusData.result.round_state["height/round/step"] || "");
      // Use previous consensus state if height increments by 1
      if (prevConsensus && prevHeight && height === prevHeight + 1) {
        // setChainId(prevConsensus.chain_id || null);
        setLastBlockTime(prevConsensus.time ? new Date(prevConsensus.time) : null);
      } else if (height > 1) {
        try {
          const blockRes = await fetch(`${RPC_URL}/block?height=${height - 1}`);
          const blockData = await blockRes.json();
          const header = blockData.result.block.header;
          setChainId(header.chain_id);
          setLastBlockTime(new Date(header.time));
        } catch {
          setChainId(null);
          setLastBlockTime(null);
        }
      } else {
        setChainId(null);
        setLastBlockTime(null);
      }
      const validatorsRes = await fetch(`${RPC_URL}/validators?height=${height}`);
      const validatorsData = await validatorsRes.json();
      setValidators(validatorsData.result.validators);
      // Store previous consensus state and height for next fetch
      setPrevConsensus({
        chain_id: consensusData.result.round_state.chain_id || chainId,
        time: consensusData.result.round_state.start_time || null,
      });
      setPrevHeight(height);
    } catch {
      setConsensus(null);
      setValidators([]);
      setChainId(null);
      setLastBlockTime(null);
      setProposer(null);
      setBlockStartTime(null);
      setPrevConsensus(null);
      setPrevHeight(null);
    } finally {
      setLoading(false);
      setLoadingValidators(false);
      setTimer(1);
    }
  };

  useEffect(() => {
    fetchData();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (timer === 0) {
      fetchData();
      return;
    }
    timerRef.current = setTimeout(() => setTimer((t) => t - 1), 2000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [timer]);

  // Summary fields
  let prevotes = 0, precommits = 0;
  if (consensus) {
    prevotes = parseBitArray(consensus.height_vote_set?.[0]?.prevotes_bit_array || "").percent;
    precommits = parseBitArray(consensus.height_vote_set?.[0]?.precommits_bit_array || "").percent;
  }


  // Voting power calculations
  const totalVotingPower = validators.reduce((sum, v) => sum + Number(v.voting_power), 0);
  let cumulative = 0;

  // Sorting and ordering
  let sortedValidators = [...validators];
  // Order by favourites first
  sortedValidators.sort((a, b) => {
    const aFav = favourites.includes(a.address);
    const bFav = favourites.includes(b.address);
    if (aFav && !bFav) return -1;
    if (!aFav && bFav) return 1;
    // If both are (or aren't) favourites, sort by voting power
    const aPower = Number(a.voting_power);
    const bPower = Number(b.voting_power);
    return sortByPower === "desc" ? bPower - aPower : aPower - bPower;
  });

  // Calculate progress percent and steps
  // const prevotesDone = prevotes > 67;
  // const precommitsDone = precommits > 67;
  // const finalized = prevHeight !== null && height > prevHeight;
  // let progressPercent = 0;
  // if (height > 0) progressPercent = 25;
  // if (prevotesDone) progressPercent = 50;
  // if (precommitsDone) progressPercent = 75;
  // if (finalized) progressPercent = 100;
  const stepLabels = [
    { label: "Block Started", percent: 25 },
    { label: "Prevote", percent: 50 },
    { label: "Precommit", percent: 75 },
    { label: "Finalized", percent: 100 },
  ];

  // Animate progressFill on block start and step changes
  // useEffect(() => {
  //   // On new block, flash to 100%, reset to 0, then animate to new progressPercent
  //   if (firstLoad.current) {
  //     setProgressFill(progressPercent);
  //     prevProgressRef.current = progressPercent;
  //     return;
  //   }
  //   if (prevHeight !== null && height !== prevHeight) {
  //     setProgressFill(100);
  //     setTimeout(() => {
  //       setProgressFill(0);
  //       prevProgressRef.current = 0;
  //       setTimeout(() => {
  //         setProgressFill(progressPercent);
  //         prevProgressRef.current = progressPercent;
  //       }, 80);
  //     }, 100);
  //   } else {
  //     setProgressFill(progressPercent);
  //     prevProgressRef.current = progressPercent;
  //   }
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [height, progressPercent]);

  const fetchDumpConsensus = useCallback(async () => {
    setDumpLoading(true);
    setDumpError(null);
    try {
      const res = await fetch(`${RPC_URL}/dump_consensus_state`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setDumpConsensus(data);
    } catch (err: any) {
      setDumpError(err.message || "Unknown error");
      setDumpConsensus(null);
    } finally {
      setDumpLoading(false);
    }
  }, []);

  // Auto-refresh every second, like consensus state
  useEffect(() => {
    fetchDumpConsensus();
    const interval = setInterval(fetchDumpConsensus, 10000);
    return () => clearInterval(interval);
  }, [fetchDumpConsensus]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Banner */}
      <div className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white text-center py-2 px-4 font-medium text-sm shadow-md">
        Support us by delegating to
        <a
          href="https://staking.polygon.technology/validators/50"
          target="_blank"
          rel="noopener noreferrer"
          className="underline font-semibold ml-1 hover:text-yellow-200"
        >
          Vitwit validator
        </a>
        🚀
      </div>

      {/* Navbar */}
      <Navbar shrink={true} />

      <main className="flex-1 mt-4">
        {activeMenu === "consensus" && (
          <section className="p-4 sm:p-8 max-w-5xl mx-auto bg-white rounded-xl shadow-lg">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <h1 className="text-2xl font-bold">Consensus State</h1>
                {NETWORK_NAME && (
                  <span className="text-base font-medium text-blue-700 bg-blue-50 rounded px-3 py-1 ml-0 sm:ml-3 mt-1 sm:mt-0">{NETWORK_NAME}</span>
                )}
              </div>
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700 transition min-w-[120px]"
                onClick={fetchData}
                disabled={loading}
              >
                {loading ? "Refreshing..." : `Refresh (${timer}s)`}
              </button>
            </div>

            {/* Summary Section */}
            <div className="max-w-5xl mx-auto mb-8">
              <h2 className="text-lg font-bold mb-2 text-blue-800">
                Consensus Progress for Current Block{height ? ` (${height})` : ""}
              </h2>
              <div className="flex flex-col items-center w-full">
                <div className="relative w-full h-5 flex items-center">
                  <div className="absolute left-0 top-0 w-full h-3 bg-gray-200 rounded-full" />

                  <h1 style={{ zIndex: 1000000 }}>{currentStep}</h1>
                  <div
                    className={`absolute left-0 top-0 h-3 rounded-full transition-all duration-700 ${blockFlash ? 'ring-4 ring-blue-300' : ''}`}
                    style={{ width: `${progressFill}%`, background: 'linear-gradient(90deg, #3B82F6 0%, #8B5CF6 100%)' }}
                  />
                  {/* Step markers */}
                  {stepLabels.map((step, idx) => (
                    <div
                      key={step.percent}
                      className="absolute top-1/3 -translate-y-1/2"
                      style={{ left: `calc(${step.percent}% - 8px)` }}
                    >
                      <div className={`w-4 h-4 rounded-full border-2 ${progressFill >= step.percent ? 'bg-blue-500 border-blue-600' : 'bg-white border-gray-300'} flex items-center justify-center transition-all duration-700`}>
                        {progressFill >= step.percent ? (
                          <span className="flex items-center justify-center w-full h-full">
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 6.5L5.5 9L9 4" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                          </span>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex w-full justify-between mt-2 text-xs text-gray-700">
                  {stepLabels.map((step, idx) => (
                    <span key={step.label} className={`w-1/4 text-center ${progressFill >= step.percent ? "font-bold text-blue-700" : "text-gray-400"}`}>{step.label}</span>
                  ))}
                </div>
              </div>
            </div>

            <div className="relative mb-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div className="flex flex-col items-center bg-blue-100 rounded-lg p-4 shadow-inner">
                  <span className="text-gray-600" title="The latest block height observed by the node.">Latest Height</span>
                  <span className="text-xl font-bold text-blue-900">{height}</span>
                </div>
                <div className="flex flex-col items-center bg-green-100 rounded-lg p-4 shadow-inner">
                  <span className="text-gray-600" title="The current voting round for the latest block.">Voting Round</span>
                  <span className="text-xl font-bold text-green-900">{round}</span>
                </div>
                <div className="flex flex-col items-center bg-yellow-100 rounded-lg p-4 shadow-inner">
                  <span className="text-gray-600" title="Percentage of validators that have prevoted in this round.">Pre-votes</span>
                  <span className="text-xl font-bold text-yellow-900">{prevotes}%</span>
                </div>
                <div className="flex flex-col items-center bg-purple-100 rounded-lg p-4 shadow-inner">
                  <span className="text-gray-600" title="Percentage of validators that have precommitted in this round.">Pre-commits</span>
                  <span className="text-xl font-bold text-purple-900">{precommits}%</span>
                </div>
                <div className="flex flex-col items-center bg-gray-100 rounded-lg p-4 shadow-inner">
                  <span className="text-gray-600" title="The unique identifier of the blockchain network.">Chain ID</span>
                  <span className="text-base font-bold text-gray-900 flex items-center gap-1">
                    {chainId || "—"}
                    {chainId && <CopyButton value={chainId} />}
                  </span>
                </div>
                <div className="flex flex-col items-center bg-gray-100 rounded-lg p-4 shadow-inner">
                  <span className="text-gray-600" title="How long ago the last block was committed.">Last Block</span>
                  <span className="text-base font-bold text-gray-900">{blockStartTime ? timeAgo(blockStartTime) : "—"}</span>
                </div>
                <div className="flex flex-col items-center bg-pink-100 rounded-lg p-4 shadow-inner">
                  <span className="text-gray-600" title="Number of peers connected to this node.">Peers</span>
                  <span className="text-xl font-bold text-pink-900">{Array.isArray(dumpConsensus?.result?.peers) ? dumpConsensus.result.peers.length : '—'}</span>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                <div className="flex flex-col items-center bg-gray-100 rounded-lg p-4 shadow-inner col-span-3 md:col-span-3 w-full">
                  <span className="text-gray-600" title="The address of the validator who proposed the current block.">Proposer</span>
                  <span className="text-base font-bold text-gray-900 break-all flex items-center gap-1">
                    {proposer || "—"}
                    {proposer && <CopyButton value={proposer} />}
                  </span>
                </div>
              </div>
            </div>

            {/* Proposer Info Section (from dumpConsensus) */}
            {(() => {
              const proposerAddr = dumpConsensus?.result?.round_state?.proposer?.address;
              const proposerObj = dumpConsensus?.result?.round_state?.validators?.validators?.find?.((v: any) => v.address === proposerAddr);
              const blockProposerAddr = dumpConsensus?.result?.round_state?.proposal_block?.header?.proposer_address;
              return proposerAddr ? (
                <div className="bg-blue-50 rounded-lg p-4 shadow-inner mb-8">
                  <h3 className="text-lg font-semibold mb-2 text-blue-800">Current Proposer Info</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Proposer Address</span>
                      <div className="font-mono flex items-center gap-1">{proposerAddr}<CopyButton value={proposerAddr} /></div>
                    </div>
                    <div>
                      <span className="text-gray-500">Voting Power</span>
                      <div className="font-mono">{proposerObj?.voting_power || '—'}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">Proposer Priority</span>
                      <div className="font-mono">{proposerObj?.proposer_priority || '—'}</div>
                    </div>
                    {blockProposerAddr && (
                      <div>
                        <span className="text-gray-500">Block Proposer Address</span>
                        <div className="font-mono flex items-center gap-1">{blockProposerAddr}<CopyButton value={blockProposerAddr} /></div>
                      </div>
                    )}
                  </div>
                </div>
              ) : null;
            })()}

            {/* Validators Table Section */}
            <div className="relative">
              <div className="mb-2 flex justify-between items-center">
                <h2 className="text-xl font-bold">Validators State</h2>
                <button
                  className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 text-sm font-medium"
                  onClick={() => setSortByPower((s) => (s === "desc" ? "asc" : "desc"))}
                >
                  Sort by Voting Power: {sortByPower === "desc" ? "High → Low" : "Low → High"}
                </button>
              </div>
              <div className="relative">
                <table className="w-full bg-white rounded-lg shadow overflow-hidden">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-2 bg-gray-50 text-left text-xs text-gray-500 uppercase font-bold" title="Mark as favourite for quick access">Favourite</th>
                      <th className="py-2 px-4 bg-gray-50 text-left text-xs text-gray-500 uppercase font-bold" title="Validator operator address">Validator Address</th>
                      <th className="py-2 px-4 bg-gray-50 text-left text-xs text-gray-500 uppercase font-bold cursor-pointer select-none" title="Sort by voting power (%)" onClick={() => setSortByPower((s) => (s === "desc" ? "asc" : "desc"))}>
                        <span className="inline-flex items-center gap-1">
                          Voting Power
                          {sortByPower === "desc" ? (
                            <span title="Sort by Voting Power">
                              <svg className="inline w-4 h-4 ml-1" viewBox="0 0 16 16" fill="none"><path d="M8 11L3 6h10L8 11z" fill="#2563eb" /></svg>
                            </span>
                          ) : (
                            <span title="Sort by Voting Power">
                              <svg className="inline w-4 h-4 ml-1" viewBox="0 0 16 16" fill="none"><path d="M8 5l5 5H3l5-5z" fill="#2563eb" /></svg>
                            </span>
                          )}
                        </span>
                      </th>
                      <th className="py-2 px-4 bg-gray-50 text-left text-xs text-gray-500 uppercase font-bold" title="Cumulative voting power up to this validator">Cumulative Voting Power</th>
                      <th className="py-2 px-4 bg-gray-50 text-left text-xs text-gray-500 uppercase font-bold" title="Did this validator prevote in the current round?">Voted</th>
                      <th className="py-2 px-4 bg-gray-50 text-left text-xs text-gray-500 uppercase font-bold" title="Did this validator precommit in the current round?">Precommit</th>
                      <th className="py-2 px-4 bg-gray-50 text-left text-xs text-gray-500 uppercase font-bold" title="The latest round number for this block">Latest Round</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedValidators.map((v, idx) => {
                      const votingPower = Number(v.voting_power);
                      const votingPowerPercent = totalVotingPower ? ((votingPower / totalVotingPower) * 100).toFixed(2) : "0.00";
                      cumulative += votingPower;
                      const cumulativePercent = totalVotingPower ? ((cumulative / totalVotingPower) * 100).toFixed(2) : "0.00";
                      // Determine voted status by index in prevotes array
                      let voted = false;
                      const latestVoteSet = consensus?.height_vote_set?.[0];
                      if (latestVoteSet && Array.isArray(latestVoteSet.prevotes)) {
                        const vote = latestVoteSet.prevotes[idx];
                        voted = typeof vote === 'string' && !vote.startsWith('nil');
                      }
                      // Determine precommit status by index in precommits array
                      let precommitted = false;
                      if (latestVoteSet && Array.isArray(latestVoteSet.precommits)) {
                        const precommit = latestVoteSet.precommits[idx];
                        precommitted = typeof precommit === 'string' && !precommit.startsWith('nil');
                      }
                      const rowColor = favourites.includes(v.address)
                        ? "bg-yellow-100"
                        : voted
                          ? "bg-green-50"
                          : "bg-red-50";
                      return (
                        <tr key={v.address} className={rowColor}>
                          <td className="py-2 px-4 text-center font-sans text-sm">
                            <button
                              aria-label={favourites.includes(v.address) ? "Unfavourite" : "Favourite"}
                              onClick={() => toggleFavourite(v.address)}
                              className="text-xl focus:outline-none"
                            >
                              {favourites.includes(v.address) ? "★" : "☆"}
                            </button>
                          </td>
                          <td className="py-2 px-4 font-sans text-sm">
                            <span className="flex items-center gap-1">
                              {v.address}
                              <CopyButton value={v.address} />
                            </span>
                          </td>
                          <td className="py-2 px-4 font-sans text-sm">{votingPowerPercent}%</td>
                          <td className="py-2 px-4 font-sans text-sm">{cumulativePercent}%</td>
                          <td className="py-2 px-4 text-center font-sans text-sm">{voted ? "✅" : "❌"}</td>
                          <td className="py-2 px-4 text-center font-sans text-sm">{precommitted ? "✅" : "❌"}</td>
                          <td className="py-2 px-4 text-center font-sans text-sm">{round}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Votes by Round Section (from dumpConsensus) - moved to bottom */}
            {dumpLoading ? (
              <div>Loading votes by round...</div>
            ) : dumpError ? (
              <div className="text-red-400">Error loading votes: {dumpError}</div>
            ) : Array.isArray(dumpConsensus?.result?.round_state?.votes) && dumpConsensus.result.round_state.votes.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-4 shadow-inner mt-8">
                <h3 className="text-lg font-semibold mb-2 text-blue-800">Votes by Round</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="px-2 py-1 text-left">Round</th>
                        <th className="px-2 py-1 text-left">Prevotes Bit Array</th>
                        <th className="px-2 py-1 text-left">Precommits Bit Array</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dumpConsensus.result.round_state.votes.map((vote: any, idx: number) => (
                        <tr key={idx} className="border-b last:border-b-0">
                          <td className="px-2 py-1 font-mono">{vote.round ?? idx}</td>
                          <td className="px-2 py-1 font-mono break-all">{vote.prevotes_bit_array || '—'}</td>
                          <td className="px-2 py-1 font-mono break-all">{vote.precommits_bit_array || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        )}
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
