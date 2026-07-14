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
import {
  Search, ArrowLeft, Pause, Play, Check, X as XIcon,
  ChevronUp, ChevronDown, Star,
} from "lucide-react";

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL;
const NETWORK_NAME = process.env.NEXT_PUBLIC_NETWORK_NAME || "";

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
    <Suspense fallback={<div className="min-h-screen text-white flex items-center justify-center">Loading...</div>}>
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
    blue: "text-sky-400",
    green: "text-emerald-400",
    yellow: "text-amber-400",
    purple: "text-violet-400",
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


  const cards: { label: string; value: string | number; accent: AccentColor; animate?: boolean }[] = [
    { label: heightParam ? "Target Height" : "Latest Height", value: height ? height.toLocaleString() : "—", accent: "blue", animate: true },
    ...(heightParam ? [
      { label: "Latest Height", value: eventRaw?.height ? Number(eventRaw.height).toLocaleString() : "Loading...", accent: "blue" as AccentColor }
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

  const proposerAddr = dumpConsensus?.result?.round_state?.proposer?.address;
  const proposerObj = dumpConsensus?.result?.round_state?.validators?.validators?.find?.((v: any) => v.address === proposerAddr);
  const blockProposerAddr = dumpConsensus?.result?.round_state?.proposal_block?.header?.proposer_address;

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden">
      <SupportUS />

      <Navbar shrink={false} />

      <main className="flex-1">
        <section className="mx-auto max-w-[1600px] px-4 sm:px-6 pb-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pt-6 pb-6 animate-rise">
            <div className="flex items-center gap-3">
              {heightParam && (
                <button
                  onClick={() => {
                    setSearchInput("");
                    window.location.href = "/consensus";
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--edge)] bg-[var(--bg-panel)] text-slate-400 transition-all hover:border-cyan-400/40 hover:text-white"
                  title="Go to live consensus page"
                >
                  <ArrowLeft size={16} />
                </button>
              )}
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white">
                  Consensus <span className="text-gradient">State</span>
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  {heightParam ? `Historical view for block ${Number(heightParam).toLocaleString()}` : "Validator voting in real time"}
                </p>
              </div>

              {NETWORK_NAME && (
                <span className="chip hidden md:inline-flex">
                  {!heightParam && <span className="live-dot" />}
                  {NETWORK_NAME}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="relative group">
                <input
                  type="text"
                  placeholder="Search by height..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSearch();
                  }}
                  className="w-48 rounded-lg border border-[var(--edge)] bg-[var(--bg-panel)] py-2 pl-9 pr-20 text-sm text-white placeholder:text-slate-600 transition-all focus:border-cyan-400/50 focus:outline-none focus:ring-2 focus:ring-cyan-400/10 sm:w-64"
                />
                <Search
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 transition-colors group-focus-within:text-cyan-400"
                />
                <button
                  onClick={handleSearch}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md bg-cyan-500/15 px-2.5 py-1 text-xs font-semibold text-cyan-300 transition-colors hover:bg-cyan-500/25 cursor-pointer"
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
                  className={`flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-semibold transition-all cursor-pointer ${paused
                    ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/20"
                    : "border-rose-400/30 bg-rose-400/10 text-rose-300 hover:bg-rose-400/20"
                    }`}
                >
                  {paused ? <Play size={14} /> : <Pause size={14} />}
                  {paused ? "Resume" : "Pause"}
                </button>
              )}
            </div>
          </div>

          {/* Consensus progress */}
          <div className="card p-6 mb-6 animate-rise">
            <div className="flex justify-between items-center mb-6">
              <h2 className="section-title">
                Consensus Progress {height ? `· Block ${height.toLocaleString()}` : ""}
              </h2>
              <span className="chip !text-cyan-300 !border-cyan-400/25 !bg-cyan-400/[0.07]">{currentStep || "—"}</span>
            </div>
            <div className="flex flex-col items-center w-full">
              <div className="relative w-full h-5 flex items-center">
                <div className="absolute left-0 top-1 w-full h-2.5 rounded-full bg-white/[0.05] border border-[var(--edge)]" />

                <div
                  className={`progress-live absolute left-0 top-1 h-2.5 rounded-full transition-all duration-700 ${blockFlash ? "ring-4 ring-cyan-300/40" : ""}`}
                  style={{ width: `${progressFill}%` }}
                />
                {/* Step markers */}
                {stepLabels.map((step) => (
                  <div
                    key={step.percent}
                    className="absolute top-[9px] -translate-y-1/2"
                    style={{ left: `calc(${step.percent}% - 10px)` }}
                  >
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center transition-all duration-500 ${progressFill >= step.percent
                        ? "bg-gradient-to-br from-cyan-400 to-emerald-400 shadow-[0_0_12px_rgba(34,211,238,0.5)]"
                        : "bg-[#0c1220] border-2 border-slate-700"
                        }`}
                    >
                      {progressFill >= step.percent && (
                        <Check size={11} strokeWidth={3.5} className="text-[#05080f]" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex w-full justify-between mt-3 text-xs">
                {stepLabels.map((step) => (
                  <span
                    key={step.label}
                    className={`w-1/4 text-center transition-colors duration-500 ${progressFill >= step.percent
                      ? "font-semibold text-cyan-300"
                      : "text-slate-600"
                      }`}
                  >
                    {step.label}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Stat cards */}
          <div className="stagger grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            {cards.map(({ label, value, accent, animate }) => (
              <div
                key={label}
                className="card card-hover px-5 py-4"
              >
                <h3 className="section-title mb-2">{label}</h3>
                <div
                  className={`text-2xl font-mono font-bold leading-tight truncate ${colorMap[accent]}`}
                  title={value.toString()}
                >
                  <span key={animate ? String(value) : undefined} className={animate ? "animate-value" : undefined}>
                    {value}
                  </span>
                </div>
              </div>
            ))}
            <div
              key="proposer"
              className="card card-hover col-span-1 sm:col-span-2 px-5 py-4"
            >
              <h3 className="section-title mb-2">Proposer</h3>
              <div className="text-xl font-mono font-bold leading-tight truncate">
                {proposer ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="text-cyan-400">{shorten(proposer, 12)}</span>
                    <CopyButton value={proposer} />
                  </span>
                ) : (
                  <span className="text-slate-600">—</span>
                )}
              </div>
            </div>
          </div>

          {/* Proposer Info Section */}
          {proposerAddr ? (
            <div className="card p-6 mb-6 animate-rise">
              <h3 className="section-title mb-5">Current Proposer Info</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-sm">
                <div>
                  <span className="text-xs text-slate-500">Proposer Address</span>
                  <div className="mt-1 flex items-center gap-1.5 font-mono text-slate-200 break-all">
                    {proposerAddr}
                    <CopyButton value={proposerAddr} />
                  </div>
                </div>
                <div>
                  <span className="text-xs text-slate-500">Voting Power</span>
                  <div className="mt-1 font-mono text-slate-200">
                    {proposerObj?.voting_power ? Number(proposerObj.voting_power).toLocaleString() : '—'}
                  </div>
                </div>
                <div>
                  <span className="text-xs text-slate-500">Proposer Priority</span>
                  <div className="mt-1 font-mono text-slate-200">
                    {proposerObj?.proposer_priority ?? '—'}
                  </div>
                </div>
                {blockProposerAddr && (
                  <div>
                    <span className="text-xs text-slate-500">Block Proposer Address</span>
                    <div className="mt-1 flex items-center gap-1.5 font-mono text-slate-200 break-all">
                      {blockProposerAddr}
                      <CopyButton value={blockProposerAddr} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {/* Validators Table Section */}
          <div className="animate-rise">
            <div className="mb-4 flex justify-between items-center">
              <h2 className="text-lg font-bold text-white">Validators State</h2>
              <span className="chip">{validators.length} validators</span>
            </div>

            <div className="card overflow-x-auto">
              <table className="tbl">
                <thead>
                  <tr>
                    <th className="w-12">Fav</th>
                    <th
                      className="cursor-pointer select-none hover:!text-slate-300 transition-colors"
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
                            <ChevronDown size={13} className="text-cyan-400" />
                          ) : (
                            <ChevronUp size={13} className="text-cyan-400" />
                          ))}
                      </span>
                    </th>
                    <th
                      className="cursor-pointer select-none hover:!text-slate-300 transition-colors"
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
                            <ChevronDown size={13} className="text-cyan-400" />
                          ) : (
                            <ChevronUp size={13} className="text-cyan-400" />
                          ))}
                      </span>
                    </th>
                    <th>Cumulative Voting Power</th>
                    <th>Voted</th>
                    {!heightParam && <th>Precommit</th>}
                    {!heightParam && <th>Latest Round</th>}
                  </tr>
                </thead>
                <tbody>
                  {sortedValidators.map((v) => {
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

                    const isFav = favourites.includes(v.address);
                    const rowClass = isFav
                      ? "!bg-cyan-400/[0.06]"
                      : voted && !heightParam
                        ? "!bg-emerald-400/[0.04]"
                        : "";

                    return (
                      <tr key={`${v.address}-${originalIdx}`} className={rowClass}>
                        <td className="text-center">
                          <button
                            aria-label={isFav ? "Unfavourite" : "Favourite"}
                            onClick={() => toggleFavourite(v.address)}
                            className="focus:outline-none cursor-pointer transition-transform hover:scale-110"
                          >
                            <Star
                              size={15}
                              className={isFav ? 'fill-amber-400 text-amber-400' : 'text-slate-600 hover:text-amber-400'}
                            />
                          </button>
                        </td>
                        <td className="font-mono text-[13px] text-slate-200" title={v.address}>
                          <span className="inline-flex items-center gap-1.5">
                            {monikers.get(v.address) || shorten(v.address, 10)}
                            <CopyButton value={v.address} />
                          </span>
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/[0.06]">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-500"
                                style={{ width: `${Math.min(100, Number(votingPowerPercent) * 4)}%` }}
                              />
                            </div>
                            <span className="font-mono text-xs">{votingPowerPercent}%</span>
                          </div>
                        </td>
                        <td className="font-mono text-xs">{cumulativePercent}%</td>
                        <td>
                          {voted ? (
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-400"><Check size={13} strokeWidth={3} /></span>
                          ) : (
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-rose-400/10 text-rose-400/70"><XIcon size={13} strokeWidth={3} /></span>
                          )}
                        </td>
                        {!heightParam && (
                          <td>
                            {precommitted ? (
                              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-400"><Check size={13} strokeWidth={3} /></span>
                            ) : (
                              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-rose-400/10 text-rose-400/70"><XIcon size={13} strokeWidth={3} /></span>
                            )}
                          </td>
                        )}
                        {!heightParam && <td className="font-mono text-center">{round}</td>}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Votes by Round Section */}
          {dumpLoading ? (
            <div className="text-slate-500 mt-6">Loading votes by round...</div>
          ) : dumpError ? (
            <div className="text-rose-400 mt-6">Error loading votes: {dumpError}</div>
          ) : Array.isArray(dumpConsensus?.result?.round_state?.votes) &&
          dumpConsensus.result.round_state.votes.length > 0 && (
            <div className="card p-6 mt-6 animate-rise">
              <h3 className="section-title mb-4">Votes by Round</h3>
              <div className="overflow-x-auto">
                <table className="tbl !text-xs">
                  <thead>
                    <tr>
                      <th>Round</th>
                      <th>Prevotes Bit Array</th>
                      <th>Precommits Bit Array</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dumpConsensus.result.round_state.votes.map((vote: any, idx: number) => (
                      <tr key={idx}>
                        <td className="font-mono">{vote.round ?? idx}</td>
                        <td className="font-mono !whitespace-normal break-all text-slate-500">{vote.prevotes_bit_array || '—'}</td>
                        <td className="font-mono !whitespace-normal break-all text-slate-500">{vote.precommits_bit_array || '—'}</td>
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
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-xl border border-rose-500/30 bg-[#160a10]/95 px-5 py-3 text-rose-200 shadow-[0_16px_48px_rgba(0,0,0,0.6)] backdrop-blur-xl animate-rise">
          <span className="text-sm">{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="rounded p-1 text-rose-400 transition-colors hover:bg-white/[0.06] hover:text-white">
            <XIcon size={14} />
          </button>
        </div>
      )}
    </div>

  );
}
