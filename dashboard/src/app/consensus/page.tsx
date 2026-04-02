"use client";

import React, { useEffect, useState, useRef, useCallback, Suspense } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useTendermint } from "../context/TendermintListener";
import { useTendermintHistory, ValidatorInfo } from "../context/TendermintHistoryListener";
import { useSearchParams, useRouter } from "next/navigation";
import { SupportUS } from "../components/SupportUs";
import { useWebSocket } from "../context/WebsocketContext";
import { Stats } from "../types/ws";
import CopyButton from "../components/CopyButton";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClipboard, faCheck, faSearch, faArrowLeft } from '@fortawesome/free-solid-svg-icons';

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL;
const NETWORK_NAME = process.env.NEXT_PUBLIC_NETWORK_NAME || "";

function parseHeightRoundStep(str: string) {
  const [height, round] = str.split("/");
  return { height: Number(height), round: Number(round) };
}

const shorten = (str: string, chars = 6): string => {
  if (!str) return '';
  return `${str.slice(0, chars)}...${str.slice(-chars)}`;
}

function parseBitArray(str: string) {
  const match = str.match(/([\d]+)\/([\d]+)\s*=\s*([\d.]+)/);
  if (!match) return { percent: 0 };
  return { percent: Math.round(Number(match[3]) * 100) };
}

function timeAgo(date: Date | null) {
  if (!date) return "";
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  return `${Math.floor(diffSec / 3600)}h ago`;
}

type AccentColor = "blue" | "green" | "yellow" | "purple";

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0f1115] text-white flex items-center justify-center">Loading...</div>}>
      <ConsensusStatePage />
    </Suspense>
  );
}

function ConsensusStatePage() {
  const [consensus, setConsensus] = useState<any>(null);
  const [validators, setValidators] = useState<ValidatorInfo[]>([]);
  const [timer, setTimer] = useState(1);
  const [favourites, setFavourites] = useState<string[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);
  const [proposer, setProposer] = useState<string | null>(null);
  const [prevConsensus, setPrevConsensus] = useState<any>(null);
  const [prevHeight, setPrevHeight] = useState<number | null>(null);
  const [blockFlash, setBlockFlash] = useState(false);
  const [progressFill, setProgressFill] = useState(0);
  const [dumpConsensus, setDumpConsensus] = useState<any>(null);
  const [dumpLoading, setDumpLoading] = useState(false);
  const [dumpError, setDumpError] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const searchParams = useSearchParams();
  const router = useRouter();
  const heightParam = searchParams.get("height");

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (errorMsg) {
      const t = setTimeout(() => setErrorMsg(null), 5000);
      return () => clearTimeout(t);
    }
  }, [errorMsg]);

  const parseHeight = (val: string | null) => {
    if (!val) return null;
    const clean = val.replace(/,/g, "").trim();
    if (!/^\d+$/.test(clean)) return NaN;
    const num = Number(clean);
    if (num <= 0) return NaN;
    return num;
  };

  const handleSearch = useCallback(() => {
    const numHeight = parseHeight(searchInput);
    if (!numHeight || isNaN(numHeight)) {
      setErrorMsg("Invalid height. Please enter numbers only.");
      return;
    }
    router.push(`/consensus?height=${numHeight}`);
  }, [searchInput, router]);

  const [historicalEvent, setHistoricalEvent] = useState<any>(null);
  const [historicalHistory, setHistoricalHistory] = useState<any>(null);

  const eventRaw = useTendermint();
  const historyRaw = useTendermintHistory();

  const event = heightParam ? historicalEvent : (paused ? null : eventRaw);
  const history = heightParam ? historicalHistory : (paused ? null : historyRaw);

  const [currentStep, setCurrentStep] = useState<string>("");
  const [height, setHeight] = useState<number>(0);
  const [round, setRound] = useState<number>(0);

  const { nodesStats } = useWebSocket();

  const [monikers, setMonikers] = useState<Map<string, string>>(new Map());
  useEffect(() => {
    if (nodesStats?.type === "node_stats") {
      const m = new Map<string, string>();
      nodesStats.stats.forEach((stat: Stats) => {
        m.set(stat.address, stat.moniker);
      });
      setMonikers(m);
    }
  }, [nodesStats]);

  useEffect(() => {
    if (history?.validators && history.validators.length > 0) {
      setValidators(history.validators);
    }
  }, [history?.validators]);

  useEffect(() => {
    if (!heightParam) {
      setSearchInput("");
      setHistoricalEvent(null);
      setHistoricalHistory(null);
      setValidators(historyRaw?.validators || []);
      setPaused(false);
    } else {
      setHeight(Number(heightParam));
      setSearchInput(heightParam);
      // Clear old historical data to force a fresh fetch state
      setHistoricalEvent(null);
      setHistoricalHistory(null);
      setValidators([]);
      setCurrentStep("Loading...");
      setProgressFill(0);
    }
  }, [heightParam]);

  const [lastBlockTime, setLastBlockTime] = useState(new Date());
  useEffect(() => {
    if (!event) return;
    if (event.step) {
        if (event.step === "Commit") setCurrentStep("Finalized");
        else setCurrentStep(event.step);
    }
    switch (event.step) {
      case "NewHeight":
        setProgressFill(25);
        setLastBlockTime(new Date());
        break;
      case "Propose":
        setTimeout(() => setProgressFill(50), 250);
        break;
      case "Prevote":
        setTimeout(() => setProgressFill(75), 400);
        break;
      case "Commit":
        setTimeout(() => setProgressFill(100), 500);
        break;
    }
    if (height < event.height) {
      setTimeout(() => setProgressFill(0), 1000);
      setHeight(event.height);
      setRound(event.round);
      setBlockFlash(true);
      setTimeout(() => setBlockFlash(false), 200);
    }
  }, [event]);

  useEffect(() => {
    const favs = localStorage.getItem("favourite_validators");
    if (favs) setFavourites(JSON.parse(favs));
  }, []);

  useEffect(() => {
    localStorage.setItem("favourite_validators", JSON.stringify(favourites));
  }, [favourites]);

  const toggleFavourite = useCallback((address: string) => {
    setFavourites((prev) =>
      prev.includes(address) ? prev.filter((a) => a !== address) : [...prev, address]
    );
  }, []);

  const fetchData = async () => {
    try {
      let targetHeight = parseHeight(heightParam);
      let forceLive = false;

      if (heightParam && (targetHeight === null || isNaN(targetHeight))) {
        setErrorMsg("Invalid height value provided in URL.");
        forceLive = true;
        targetHeight = null;
      }

      if (targetHeight) {
        setConsensus(null);
        setDumpConsensus(null);

        let currentRound = 0;
        let votedAddresses: string[] = [];

        try {
          const commitRes = await fetch(`${RPC_URL}/commit?height=${targetHeight}`);
          if (commitRes.ok) {
            const commitData = await commitRes.json();
            if (commitData.error) {
              throw new Error(commitData.error.data || commitData.error.message || "API Error");
            }
            const header = commitData?.result?.signed_header?.header;
            const commit = commitData?.result?.signed_header?.commit;

            setChainId(header?.chain_id || null);
            setLastBlockTime(header?.time ? new Date(header.time) : new Date());
            setProposer(header?.proposer_address || null);

            currentRound = Number(commit?.round || 0);
            const signatures = commit?.signatures || [];
            votedAddresses = signatures
              .map((s: any) => (s.validator_address || s.address)?.toUpperCase())
              .filter(Boolean);

            setHeight(targetHeight);
            setRound(currentRound);

            setHistoricalEvent({
              type: "Step",
              step: "Commit",
              height: targetHeight,
              round: currentRound,
              stepValue: 7
            });

            setCurrentStep("Finalized");
            setProgressFill(100);

            const perPage = 100;
            let page = 1;
            let allValidators: ValidatorInfo[] = [];
            for (;;) {
              const valUrl = `${RPC_URL}/validators?height=${targetHeight}&per_page=${perPage}&page=${page}`;
              const valRes = await fetch(valUrl);
              const valData = await valRes.json();
              const vals = valData?.result?.validators ?? [];
              const mapped: ValidatorInfo[] = vals.map((v: any) => {
                const addr = v.address.toUpperCase();
                const voted = votedAddresses.includes(addr);
                return {
                  address: addr,
                  votingPower: Number(v.voting_power),
                  prevote: voted, 
                  precommit: voted,
                };
              });
              allValidators = allValidators.concat(mapped);
              if (vals.length < perPage) break;
              page += 1;
            }
            setValidators(allValidators);
          } else {
            throw new Error(`Height ${targetHeight} might be in the future or not available.`);
          }
        } catch (err: any) {
          console.error("Historical error:", err);
          setErrorMsg(err.message || "Failed to fetch historical data.");
          forceLive = true;
          targetHeight = null;
        }
      }

      if (!targetHeight || forceLive) {
        const consensusRes = await fetch(`${RPC_URL}/consensus_state`);
        const consensusData = await consensusRes.json();
        
        if (consensusData.error) throw new Error(consensusData.error.message);

        setConsensus(consensusData.result.round_state);
        setProposer(consensusData.result.round_state.proposer?.address || null);

        const stateStr = consensusData.result.round_state["height/round/step"] || "";
        const [h, r, s] = stateStr.split("/");
        const rpcHeight = Number(h);
        const currentRound = Number(r);
        const currentStepNum = Number(s);

        const displayHeight = rpcHeight;
        setHeight(displayHeight);
        setRound(currentRound);

        if (prevConsensus && prevHeight && displayHeight === prevHeight + 1) {
        } else if (displayHeight > 1) {
          try {
            const blockRes = await fetch(`${RPC_URL}/block?height=${displayHeight - 1}`);
            const blockData = await blockRes.json();
            const header = blockData.result.block.header;
            setChainId(header.chain_id);
            setLastBlockTime(new Date(header.time));
          } catch {
            setChainId(null);
          }
        } else {
          setChainId(null);
        }
        setPrevConsensus({
          chain_id: consensusData.result.round_state.chain_id || chainId,
          time: consensusData.result.round_state.start_time || null,
        });
        setPrevHeight(displayHeight);

        if (validators.length === 0) {
           Promise.all([
             fetch(`${RPC_URL}/validators?per_page=100&page=1`).then(r => r.json()).catch(() => null),
             fetch(`${RPC_URL}/validators?per_page=100&page=2`).then(r => r.json()).catch(() => null)
           ]).then(([valData1, valData2]) => {
             let vals = valData1?.result?.validators || [];
             if (valData2?.result?.validators) {
                 vals = vals.concat(valData2.result.validators);
             }
             if (vals.length > 0) {
                 setValidators(prev => prev.length === 0 ? vals.map((v: any) => ({
                     address: v.address.toUpperCase(),
                     votingPower: Number(v.voting_power),
                     prevote: false,
                     precommit: false,
                 })) : prev);
             }
           });
        }
        
        if (forceLive) {
          setSearchInput("");
          setTimeout(() => router.replace("/consensus"), 100);
        }
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to fetch consensus data.");
      if (heightParam) {
        setSearchInput("");
        setTimeout(() => router.replace("/consensus"), 100);
      }
      setConsensus(null);
      setChainId(null);
      setProposer(null);
      setPrevConsensus(null);
      setPrevHeight(null);
    } finally {
      if (!heightParam) setTimer(1);
    }
  };

  useEffect(() => {
    fetchData();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [heightParam]);
  useEffect(() => {
    if (paused || heightParam) return;
    if (timer === 0) {
      fetchData();
      return;
    }
    timerRef.current = setTimeout(() => setTimer((t) => t - 1), 1000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [timer]);

  let prevotes = 0, precommits = 0;
  if (consensus) {
    prevotes = parseBitArray(consensus.height_vote_set?.[0]?.prevotes_bit_array || "").percent;
    precommits = parseBitArray(consensus.height_vote_set?.[0]?.precommits_bit_array || "").percent;
  }

  const totalVotingPower = validators.reduce((sum, v) => sum + Number(v.votingPower), 0);
  const votedCount = validators.filter(v => v.prevote).length;
  
  let cumulative = 0;

  const [sortConfig, setSortConfig] = useState<{ key: "votingPower" | "address"; direction: "asc" | "desc" }>(
    { key: "votingPower", direction: "desc" } // stable default
  );

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("sortConfig");
    if (stored) setSortConfig(JSON.parse(stored));
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem("sortConfig", JSON.stringify(sortConfig));
    }
  }, [sortConfig, mounted]);


  // Sorting logic
  let sortedValidators = [...validators];
  sortedValidators.sort((a, b) => {
    const aFav = favourites.includes(a.address);
    const bFav = favourites.includes(b.address);
    if (aFav && !bFav) return -1;
    if (!aFav && bFav) return 1;

    if (sortConfig.key === "votingPower") {
      const aPower = Number(a.votingPower);
      const bPower = Number(b.votingPower);
      return sortConfig.direction === "desc" ? bPower - aPower : aPower - bPower;
    }

    if (sortConfig.key === "address") {
      const aName = monikers.get(a.address) || a.address;
      const bName = monikers.get(b.address) || b.address;
      return sortConfig.direction === "desc"
        ? bName.localeCompare(aName)
        : aName.localeCompare(bName);
    }
    return 0;
  });

  const stepLabels = [
    { label: "Block Started", percent: 25 },
    { label: "Prevote", percent: 50 },
    { label: "Precommit", percent: 75 },
    { label: "Finalized", percent: 100 },
  ];

  const colorMap: Record<AccentColor, string> = {
    blue: "text-blue-300",
    green: "text-green-300",
    yellow: "text-yellow-300",
    purple: "text-purple-300",
  };

  const [copied, setCopied] = useState(false);
  const handleCopy = async (value: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1000);
  };

  const dumpLoadingRef = useRef(false);

  const fetchDumpConsensus = useCallback(async () => {
    if (dumpLoadingRef.current) return;
    dumpLoadingRef.current = true;
    setDumpError(null);

    try {
      const res = await fetch(`${RPC_URL}/dump_consensus_state`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setDumpConsensus(data);
    } catch (err: any) {
      setDumpError(err.message || "Unknown error");
    } finally {
      dumpLoadingRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (heightParam) return;
    if (paused) return;
    fetchDumpConsensus();
  }, [event?.step, paused, fetchDumpConsensus, heightParam]);


  const cards: { label: string; value: string | number; accent: AccentColor }[] = [
    { label: heightParam ? "Target Height" : "Latest Height", value: height || "—", accent: "blue" },
    ...(heightParam ? [
      { label: "Latest Height", value: eventRaw?.height || "Loading...", accent: "blue" as AccentColor }
    ] : []),
    { label: heightParam ? "Round" : "Voting Round", value: round ?? "—", accent: "green" },
    ...(heightParam ? [
      { label: "Votes", value: `${votedCount} / ${validators.length}`, accent: "yellow" as AccentColor }
    ] : [
      { label: "Pre‑votes", value: `${prevotes ?? "—"}%`, accent: "yellow" as AccentColor },
      { label: "Pre‑commits", value: `${precommits ?? "—"}%`, accent: "purple" as AccentColor }
    ]),
    {
      label: "Chain ID",
      value: `${chainId ?? "—"}`,
      accent: "blue",
    },
    {
      label: heightParam ? "Block Time" : "Last Block",
      value: lastBlockTime ? timeAgo(lastBlockTime) : "—",
      accent: "green",
    },
    ...(heightParam ? [] : [
      {
        label: "Peers",
        value: Array.isArray(dumpConsensus?.result?.peers)
          ? dumpConsensus.result.peers.length
          : "—",
        accent: "yellow" as AccentColor,
      }
    ])
  ];

  return (
    <div className="min-h-screen bg-[#0f1115] text-gray-200 flex flex-col overflow-x-hidden">
      <SupportUS />

      {/* Navbar */}
      <Navbar shrink={false} />

      <main className="flex-1 mt-4 px-4 sm:px-8">
        <section className="p-4 sm:p-8 mx-auto bg-[#1a1e24] rounded-xl shadow-lg">
          <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              {heightParam && (
                <button
                  onClick={() => {
                    setSearchInput("");
                    window.location.href = "/consensus";
                  }}
                  className="mr-2 p-2 text-gray-400 hover:text-white transition-colors"
                  title="Go to live consensus page"
                >
                  <FontAwesomeIcon icon={faArrowLeft} size="lg" />
                </button>
              )}
              <h1 className="text-2xl font-bold text-white">Consensus State</h1>

              {NETWORK_NAME && (
                <span className="text-sm font-medium text-blue-300 bg-blue-900/30 rounded px-3 py-1 border border-blue-600">
                  {NETWORK_NAME}
                </span>
              )}
            </div>

            <div className="flex items-center gap-4">
              <div className="relative group">
                <input
                  type="text"
                  placeholder="Search by height..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSearch();
                  }}
                  className="bg-[#0f1115] border border-gray-700 rounded-lg px-4 py-1.5 pl-10 text-sm focus:outline-none focus:border-blue-500 transition-all w-48 sm:w-64"
                />
                <FontAwesomeIcon
                  icon={faSearch}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-500 transition-colors pointer-events-none"
                />
                <button
                  onClick={handleSearch}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded transition-colors"
                >
                  Search
                </button>
              </div>

              {!heightParam && (
                <button
                  onClick={() => {
                    if (paused) {
                      setPaused(false);
                      fetchData();
                    } else {
                      setPaused(true);
                    }
                  }}
                  className={`px-3 py-1.5 rounded font-semibold hover:cursor-pointer transition-colors ${paused ? "bg-green-700 hover:bg-green-600 text-white" : "bg-red-700 hover:bg-red-600 text-white"
                    }`}
                >
                  {paused ? "Resume" : "Pause"}
                </button>
              )}
            </div>
          </div>


          <div className="mx-auto mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-cyan-300">
                Consensus Progress for {heightParam ? "Historical" : "Current"} Block{height ? ` (${height.toLocaleString()})` : ""}
              </h2>
              <span className="text-sm font-semibold text-white bg-blue-600/20 px-3 py-1 rounded border border-blue-500/30">{currentStep}</span>
            </div>
            <div className="flex flex-col items-center w-full">
              <div className="relative w-full h-5 flex items-center">
                <div className="absolute left-0 top-0 w-full h-3 bg-gray-700 rounded-full" />

                <div
                  className={`absolute left-0 top-0 h-3 rounded-full transition-all duration-700 ${blockFlash ? "ring-4 ring-blue-300" : ""
                    }`}
                  style={{
                    width: `${progressFill}%`,
                    background: "linear-gradient(90deg, #3B82F6 0%, #8B5CF6 100%)",
                  }}
                />
                {/* Step markers */}
                {stepLabels.map((step) => (
                  <div
                    key={step.percent}
                    className="absolute top-1/3 -translate-y-1/2"
                    style={{ left: `calc(${step.percent}% - 8px)` }}
                  >
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all duration-700 ${progressFill >= step.percent
                        ? "bg-blue-500 border-blue-600"
                        : "bg-[#1a1e24] border-gray-600"
                        }`}
                    >
                      {progressFill >= step.percent && (
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 12 12"
                          fill="none"
                        >
                          <path
                            d="M3 6.5L5.5 9L9 4"
                            stroke="#fff"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex w-full justify-between mt-2 text-xs text-gray-400">
                {stepLabels.map((step) => (
                  <span
                    key={step.label}
                    className={`w-1/4 text-center ${progressFill >= step.percent
                      ? "font-semibold text-white"
                      : "text-gray-500"
                      }`}
                  >
                    {step.label}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="relative mb-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 text-white font-sans">
              {cards.map(({ label, value, accent }) => (
                <div
                  key={label}
                  className="bg-[#1a1e24] rounded-lg px-5 py-4 border border-[#2a2f3a] hover:border-cyan-400 transition shadow-sm"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-zinc-500/90">{label}</h3>
                  </div>
                  <div
                    className={`text-2xl font-mono font-bold leading-tight truncate ${colorMap[accent]}`}
                    title={value.toString()}
                  >
                    {value}
                  </div>
                </div>
              ))}
              <div
                key="proposer"
                className="bg-[#1a1e24] col-span-2 rounded-lg px-5 py-4 border border-[#2a2f3a] hover:border-cyan-400 transition shadow-sm"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-teal-400">Proposer</h3>
                </div>
                <div
                  className={`text-2xl font-mono font-bold leading-tight truncate text-purple-300`}
                  title="Proposer"
                >

                  {proposer &&
                    <>
                      <span className='text-cyan-400 text-md hover:cursor-pointer'
                        onClick={() => handleCopy(proposer)}
                      >{shorten(proposer, 12)}</span>&nbsp;
                      <button
                        onClick={() => handleCopy(proposer)}
                        title="Copy"
                        style={{
                          cursor: 'pointer',
                          background: 'none',
                          border: 'none',
                          padding: 0,
                        }}
                        className="text-gray-600"
                        aria-label="Copy to clipboard"
                      >
                        <FontAwesomeIcon icon={copied ? faCheck : faClipboard} />
                      </button>
                    </>
                  }
                </div>
              </div>
            </div>

          </div>
          {/* Proposer Info Section */}

          {(() => {
            const proposerAddr = dumpConsensus?.result?.round_state?.proposer?.address;
            const proposerObj = dumpConsensus?.result?.round_state?.validators?.validators?.find?.((v: any) => v.address === proposerAddr);
            const blockProposerAddr = dumpConsensus?.result?.round_state?.proposal_block?.header?.proposer_address;

            return proposerAddr ? (
              <div className="bg-[#1a1e24] rounded-lg p-4 shadow-inner mb-8 border border-gray-700">
                <h3 className="text-lg font-semibold mb-4 text-cyan-300">Current Proposer Info</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-300">
                  <div>
                    <span className="text-gray-500">Proposer Address</span>
                    <div className="font-mono flex items-center gap-1 text-gray-100">
                      {proposerAddr}&nbsp;
                      <CopyButton value={proposerAddr} />
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500">Voting Power</span>
                    <div className="font-mono text-gray-100">
                      {proposerObj?.voting_power ?? '—'}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500">Proposer Priority</span>
                    <div className="font-mono text-gray-100">
                      {proposerObj?.proposer_priority ?? '—'}
                    </div>
                  </div>
                  {blockProposerAddr && (
                    <div>
                      <span className="text-gray-500">Block Proposer Address</span>
                      <div className="font-mono flex items-center gap-1 text-gray-100">
                        {blockProposerAddr}
                        <CopyButton value={blockProposerAddr} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : null;
          })()}

          {/* Validators Table Section */}
          <div className="relative">
            <div className="mb-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-cyan-300">Validators State</h2>
            </div>

            <div className="relative overflow-x-auto border border-gray-700 rounded-lg">
              <table className="w-full bg-[#1a1e24] rounded-lg overflow-hidden">
                <thead className="bg-gray-800 text-gray-400 text-xs uppercase">
                  <tr>
                    <th className="px-4 py-2 text-left">Favourite</th>
                    <th
                      className="px-4 py-2 text-left cursor-pointer"
                      title="Sort by moniker (or address if missing)"
                      onClick={() =>
                        setSortConfig((prev) => ({
                          key: "address",
                          direction: prev.key === "address" && prev.direction === "asc" ? "desc" : "asc",
                        }))
                      }
                    >
                      <span className="inline-flex items-center gap-1">
                        Validator Address
                        {sortConfig.key === "address" &&
                          (sortConfig.direction === "desc" ? (
                            <svg className="inline w-4 h-4 ml-1" viewBox="0 0 16 16" fill="none"><path d="M8 11L3 6h10L8 11z" fill="#38bdf8" /></svg>
                          ) : (
                            <svg className="inline w-4 h-4 ml-1" viewBox="0 0 16 16" fill="none"><path d="M8 5l5 5H3l5-5z" fill="#38bdf8" /></svg>
                          ))}
                      </span>
                    </th>
                    <th
                      className="px-4 py-2 text-left cursor-pointer"
                      title="Sort by voting power (%)"
                      onClick={() =>
                        setSortConfig((prev) => ({
                          key: "votingPower",
                          direction: prev.key === "votingPower" && prev.direction === "asc" ? "desc" : "asc",
                        }))
                      }
                    >
                      <span className="inline-flex items-center gap-1">
                        Voting Power
                        {sortConfig.key === "votingPower" &&
                          (sortConfig.direction === "desc" ? (
                            <svg className="inline w-4 h-4 ml-1" viewBox="0 0 16 16" fill="none"><path d="M8 11L3 6h10L8 11z" fill="#38bdf8" /></svg>
                          ) : (
                            <svg className="inline w-4 h-4 ml-1" viewBox="0 0 16 16" fill="none"><path d="M8 5l5 5H3l5-5z" fill="#38bdf8" /></svg>
                          ))}
                      </span>
                    </th>
                    <th className="px-4 py-2 text-left">Cumulative Voting Power</th>
                    <th className="px-4 py-2 text-left">Voted</th>
                    {!heightParam && <th className="px-4 py-2 text-left">Precommit</th>}
                    {!heightParam && <th className="px-4 py-2 text-left">Latest Round</th>}
                  </tr>
                </thead>
                <tbody>
                  {sortedValidators.map((v, idx) => {
                    const votingPower = Number(v.votingPower);
                    const votingPowerPercent = totalVotingPower ? ((votingPower / totalVotingPower) * 100).toFixed(2) : "0.00";
                    cumulative += votingPower;
                    const cumulativePercent = totalVotingPower ? ((cumulative / totalVotingPower) * 100).toFixed(2) : "0.00";

                    const originalIdx = validators.findIndex(val => val.address === v.address);
                    let voted = v.prevote || false;
                    let precommitted = v.precommit || false;
                    
                    const latestVoteSet = consensus?.height_vote_set?.find((vs: any) => Number(vs.round) === round) 
                                       || consensus?.height_vote_set?.[0];

                    if (latestVoteSet && !heightParam && originalIdx !== -1) {
                      voted = voted || (typeof latestVoteSet.prevotes?.[originalIdx] === 'string' && !latestVoteSet.prevotes[originalIdx].startsWith('nil'));
                      precommitted = precommitted || (typeof latestVoteSet.precommits?.[originalIdx] === 'string' && !latestVoteSet.precommits[originalIdx].startsWith('nil'));
                    }

                    const rowColor = heightParam
                      ? (idx % 2 === 0 ? "bg-[#1a1e24]" : "bg-[#21262d]")
                      : favourites.includes(v.address)
                        ? "bg-cyan-900"
                        : voted
                          ? "bg-green-900"
                          : "bg-gray-900";

                    return (
                      <tr key={v.address} className={`${rowColor} text-gray-100`}>
                        <td className="px-4 py-2 text-center">
                          <button
                            aria-label={favourites.includes(v.address) ? "Unfavourite" : "Favourite"}
                            onClick={() => toggleFavourite(v.address)}
                            className="text-xl text-yellow-400 focus:outline-none"
                          >
                            {favourites.includes(v.address) ? "★" : "☆"}
                          </button>
                        </td>
                        <td className="px-4 py-2 font-mono text-sm flex items-left gap-1"
                          title={v.address}
                        >
                          {monikers.get(v.address) || v.address}&nbsp;<CopyButton value={v.address} />
                        </td>
                        <td className="px-4 py-2">{votingPowerPercent}%</td>
                        <td className="px-4 py-2">{cumulativePercent}%</td>
                        <td className="px-4 py-2 text-center">{voted ? "✅" : "❌"}</td>
                        {!heightParam && <td className="px-4 py-2 text-center">{precommitted ? "✅" : "❌"}</td>}
                        {!heightParam && <td className="px-4 py-2 text-center">{round}</td>}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Votes by Round Section */}
          {dumpLoading ? (
            <div className="text-gray-400 mt-6">Loading votes by round...</div>
          ) : dumpError ? (
            <div className="text-red-400 mt-6">Error loading votes: {dumpError}</div>
          ) : Array.isArray(dumpConsensus?.result?.round_state?.votes) &&
          dumpConsensus.result.round_state.votes.length > 0 && (
            <div className="bg-[#1a1e24] border border-gray-700 rounded-lg p-4 shadow-inner mt-8">
              <h3 className="text-lg font-semibold mb-2 text-cyan-300">Votes by Round</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs text-gray-200">
                  <thead>
                    <tr className="bg-gray-800 text-gray-400">
                      <th className="px-2 py-2 text-left">Round</th>
                      <th className="px-2 py-2 text-left">Prevotes Bit Array</th>
                      <th className="px-2 py-2 text-left">Precommits Bit Array</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dumpConsensus.result.round_state.votes.map((vote: any, idx: number) => (
                      <tr key={idx} className="border-b border-gray-700 last:border-b-0">
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
      </main>

      <Footer />

      {errorMsg && (
        <div className="fixed bottom-4 right-4 bg-red-600/90 text-white px-6 py-3 rounded shadow-lg z-50 flex items-center gap-3">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="text-white hover:text-gray-200 text-xl leading-none">
            &times;
          </button>
        </div>
      )}
    </div >

  );
}
