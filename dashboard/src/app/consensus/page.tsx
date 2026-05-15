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
    <div
      className="min-h-screen flex flex-col overflow-x-hidden"
      style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}
    >
      <SupportUS />
      <Navbar shrink={false} />

      <main className="flex-1 px-4 sm:px-6 pt-6 pb-10 max-w-[1400px] mx-auto w-full">
        {/* ── Page Header ── */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            {heightParam && (
              <button
                onClick={() => { setSearchInput(""); window.location.href = "/consensus"; }}
                className="p-2 rounded-md transition-colors"
                style={{ color: "var(--text-secondary)" }}
                title="Back to live consensus"
              >
                <FontAwesomeIcon icon={faArrowLeft} />
              </button>
            )}
            <div>
              <h1 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>
                Consensus State
              </h1>
              <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
                {heightParam ? `Historical view — height ${heightParam}` : "Live Tendermint consensus tracking"}
              </p>
            </div>
            {NETWORK_NAME && (
              <span
                className="self-start sm:self-auto flex items-center gap-1.5 text-xs font-medium rounded-full px-3 py-1 border"
                style={{
                  background: "rgba(56,139,253,0.08)",
                  borderColor: "rgba(56,139,253,0.25)",
                  color: "var(--accent-blue)",
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "var(--accent-blue)" }} />
                {NETWORK_NAME}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Search input */}
            <div
              className="relative flex items-center border rounded-lg transition-all focus-within:border-[var(--accent-blue)]"
              style={{ background: "var(--bg-surface)", borderColor: "var(--border-default)" }}
            >
              <FontAwesomeIcon
                icon={faSearch}
                className="absolute left-3 pointer-events-none"
                style={{ color: "var(--text-muted)", fontSize: 12 }}
              />
              <input
                type="text"
                placeholder="Search by height…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
                className="bg-transparent outline-none text-sm pl-9 pr-20 py-2 w-48 sm:w-60"
                style={{ color: "var(--text-primary)" }}
              />
              <button
                onClick={handleSearch}
                className="absolute right-2 text-xs px-2.5 py-1 rounded-md font-medium transition-colors"
                style={{ background: "var(--accent-blue)", color: "#fff" }}
              >
                Go
              </button>
            </div>

            {/* Pause/Resume */}
            {!heightParam && (
              <button
                onClick={() => { if (paused) { setPaused(false); fetchData(); } else setPaused(true); }}
                className="px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors cursor-pointer"
                style={paused
                  ? { color: "var(--accent-green)", borderColor: "rgba(63,185,80,0.4)", background: "rgba(63,185,80,0.08)" }
                  : { color: "var(--accent-red)",   borderColor: "rgba(248,81,73,0.4)", background: "rgba(248,81,73,0.08)" }
                }
              >
                {paused ? "Resume" : "Pause"}
              </button>
            )}
          </div>
        </div>


        {/* ── Consensus Progress ── */}
        <div
          className="rounded-xl border p-5 mb-6"
          style={{ background: "var(--bg-surface)", borderColor: "var(--border-default)" }}
        >
          <div className="flex justify-between items-center mb-5">
            <div>
              <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                {heightParam ? "Historical" : "Current"} Block Progress
                {height ? (
                  <span className="ml-2 font-mono" style={{ color: "var(--accent-blue)" }}>
                    #{height.toLocaleString()}
                  </span>
                ) : null}
              </h2>
            </div>
            <span
              className="text-xs font-semibold px-3 py-1 rounded-full border"
              style={{
                color: "var(--accent-blue)",
                borderColor: "rgba(88,166,255,0.3)",
                background: "rgba(88,166,255,0.08)",
              }}
            >
              {currentStep || "—"}
            </span>
          </div>

          {/* Progress bar */}
          <div className="flex flex-col w-full">
            <div className="relative w-full h-2 flex items-center mb-6">
              {/* Track */}
              <div
                className="absolute left-0 top-0 w-full h-2 rounded-full"
                style={{ background: "var(--bg-overlay)" }}
              />
              {/* Fill */}
              <div
                className={`absolute left-0 top-0 h-2 rounded-full transition-all duration-700 ${blockFlash ? "ring-2 ring-offset-1 ring-blue-400" : ""}`}
                style={{
                  width: `${progressFill}%`,
                  background: "linear-gradient(90deg, #388bfd 0%, #bc8cff 100%)",
                }}
              />
              {/* Step dots */}
              {stepLabels.map((step) => (
                <div
                  key={step.percent}
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
                  style={{ left: `${step.percent}%` }}
                >
                  <div
                    className="w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all duration-500"
                    style={{
                      background: progressFill >= step.percent ? "var(--accent-blue)" : "var(--bg-elevated)",
                      borderColor: progressFill >= step.percent ? "#388bfd" : "var(--border-default)",
                    }}
                  >
                    {progressFill >= step.percent && (
                      <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
                        <path d="M3 6.5L5.5 9L9 4" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Step labels */}
            <div className="flex w-full justify-between">
              {stepLabels.map((step) => (
                <span
                  key={step.label}
                  className="w-1/4 text-center text-xs font-medium"
                  style={{
                    color: progressFill >= step.percent ? "var(--text-primary)" : "var(--text-muted)",
                  }}
                >
                  {step.label}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ── Metric Cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-6">
          {cards.map(({ label, value, accent }) => (
            <div key={label} className="e-card px-4 py-4">
              <p className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: "var(--text-secondary)" }}>
                {label}
              </p>
              <div
                className="text-xl font-mono font-bold leading-tight truncate"
                title={value.toString()}
                style={{ color: accent === "blue" ? "var(--accent-blue)" : accent === "green" ? "var(--accent-green)" : accent === "yellow" ? "var(--accent-amber)" : "var(--accent-purple)" }}
              >
                {value}
              </div>
            </div>
          ))}

          {/* Proposer card */}
          <div className="e-card col-span-2 px-4 py-4">
            <p className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: "var(--text-secondary)" }}>
              Proposer
            </p>
            <div className="flex items-center gap-2 font-mono text-base font-bold truncate" style={{ color: "var(--accent-cyan)" }}>
              {proposer ? (
                <>
                  <span className="cursor-pointer hover:opacity-75 transition-opacity" onClick={() => handleCopy(proposer)}>
                    {shorten(proposer, 12)}
                  </span>
                  <button
                    onClick={() => handleCopy(proposer)}
                    title="Copy address"
                    className="transition-colors"
                    style={{ color: copied ? "var(--accent-green)" : "var(--text-muted)", background: "none", border: "none", padding: 0, cursor: "pointer" }}
                  >
                    <FontAwesomeIcon icon={copied ? faCheck : faClipboard} size="sm" />
                  </button>
                </>
              ) : (
                <span style={{ color: "var(--text-muted)" }}>—</span>
              )}
            </div>
          </div>
        </div>
        {/* ── Proposer Info ── */}
        {(() => {
          const proposerAddr = dumpConsensus?.result?.round_state?.proposer?.address;
          const proposerObj = dumpConsensus?.result?.round_state?.validators?.validators?.find?.((v: any) => v.address === proposerAddr);
          const blockProposerAddr = dumpConsensus?.result?.round_state?.proposal_block?.header?.proposer_address;

          if (!proposerAddr) return null;
          return (
            <div
              className="rounded-xl border p-5 mb-6"
              style={{ background: "var(--bg-surface)", borderColor: "var(--border-default)" }}
            >
              <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
                Current Proposer
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-sm">
                {[
                  { label: "Proposer Address", value: proposerAddr, copy: proposerAddr },
                  { label: "Voting Power", value: proposerObj?.voting_power ?? "—" },
                  { label: "Proposer Priority", value: proposerObj?.proposer_priority ?? "—" },
                  ...(blockProposerAddr ? [{ label: "Block Proposer Address", value: blockProposerAddr, copy: blockProposerAddr }] : []),
                ].map(({ label, value, copy }) => (
                  <div key={label}>
                    <p className="text-xs mb-1 uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{label}</p>
                    <div className="font-mono text-sm flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                      <span className="truncate">{value}</span>
                      {copy && <CopyButton value={String(copy)} />}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* ── Validators Table ── */}
        <div
          className="rounded-xl border overflow-hidden mb-6"
          style={{ borderColor: "var(--border-default)" }}
        >
          <div
            className="px-5 py-3.5 border-b flex items-center justify-between"
            style={{ background: "var(--bg-surface)", borderColor: "var(--border-default)" }}
          >
            <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              Validators State
              <span
                className="ml-2 text-xs font-normal px-2 py-0.5 rounded-full"
                style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)" }}
              >
                {validators.length}
              </span>
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "var(--bg-elevated)", borderBottom: "1px solid var(--border-default)" }}>
                  <th className="px-4 py-3 text-left w-10" style={{ color: "var(--text-secondary)" }}>
                    <span className="text-xs">★</span>
                  </th>
                  <th
                    className="px-4 py-3 text-left cursor-pointer select-none text-xs font-semibold uppercase tracking-wider"
                    style={{ color: sortConfig.key === "address" ? "var(--accent-blue)" : "var(--text-secondary)" }}
                    onClick={() => setSortConfig((p) => ({ key: "address", direction: p.key === "address" && p.direction === "asc" ? "desc" : "asc" }))}
                  >
                    <span className="inline-flex items-center gap-1">
                      Validator
                      {sortConfig.key === "address" && (
                        <svg className="w-3 h-3" viewBox="0 0 16 16" fill="none">
                          {sortConfig.direction === "desc"
                            ? <path d="M8 11L3 6h10L8 11z" fill="currentColor" />
                            : <path d="M8 5l5 5H3l5-5z" fill="currentColor" />}
                        </svg>
                      )}
                    </span>
                  </th>
                  <th
                    className="px-4 py-3 text-left cursor-pointer select-none text-xs font-semibold uppercase tracking-wider"
                    style={{ color: sortConfig.key === "votingPower" ? "var(--accent-blue)" : "var(--text-secondary)" }}
                    onClick={() => setSortConfig((p) => ({ key: "votingPower", direction: p.key === "votingPower" && p.direction === "asc" ? "desc" : "asc" }))}
                  >
                    <span className="inline-flex items-center gap-1">
                      Voting Power
                      {sortConfig.key === "votingPower" && (
                        <svg className="w-3 h-3" viewBox="0 0 16 16" fill="none">
                          {sortConfig.direction === "desc"
                            ? <path d="M8 11L3 6h10L8 11z" fill="currentColor" />
                            : <path d="M8 5l5 5H3l5-5z" fill="currentColor" />}
                        </svg>
                      )}
                    </span>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Cumulative</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Prevote</th>
                  {!heightParam && <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Precommit</th>}
                  {!heightParam && <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Round</th>}
                </tr>
              </thead>

              <tbody>
                {sortedValidators.map((v, idx) => {
                  const votingPower = Number(v.votingPower);
                  const votingPowerPercent = totalVotingPower ? ((votingPower / totalVotingPower) * 100).toFixed(2) : "0.00";
                  cumulative += votingPower;
                  const cumulativePercent = totalVotingPower ? ((cumulative / totalVotingPower) * 100).toFixed(2) : "0.00";

                  const originalIdx = validators.findIndex((val) => val.address === v.address);
                  let voted = v.prevote || false;
                  let precommitted = v.precommit || false;

                  const latestVoteSet =
                    consensus?.height_vote_set?.find((vs: any) => Number(vs.round) === round) ||
                    consensus?.height_vote_set?.[0];

                  if (latestVoteSet && !heightParam && originalIdx !== -1) {
                    voted = voted || (typeof latestVoteSet.prevotes?.[originalIdx] === "string" && !latestVoteSet.prevotes[originalIdx].startsWith("nil"));
                    precommitted = precommitted || (typeof latestVoteSet.precommits?.[originalIdx] === "string" && !latestVoteSet.precommits[originalIdx].startsWith("nil"));
                  }

                  const isFav = favourites.includes(v.address);

                  return (
                    <tr
                      key={v.address}
                      style={{
                        background: isFav
                          ? "rgba(88,166,255,0.06)"
                          : voted
                          ? "rgba(63,185,80,0.04)"
                          : "var(--bg-primary)",
                        borderBottom: "1px solid var(--border-subtle)",
                        color: "var(--text-primary)",
                      }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "var(--bg-elevated)")}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.background = isFav
                          ? "rgba(88,166,255,0.06)"
                          : voted
                          ? "rgba(63,185,80,0.04)"
                          : "var(--bg-primary)";
                      }}
                    >
                      {/* Favourite */}
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => toggleFavourite(v.address)}
                          className="focus:outline-none transition-colors"
                          style={{ color: isFav ? "#e3b341" : "var(--text-muted)", fontSize: 16 }}
                        >
                          {isFav ? "★" : "☆"}
                        </button>
                      </td>

                      {/* Validator address / moniker */}
                      <td className="px-4 py-3 font-mono text-xs" title={v.address}>
                        <div className="flex items-center gap-2">
                          <span style={{ color: "var(--text-primary)" }}>
                            {monikers.get(v.address) || v.address}
                          </span>
                          <CopyButton value={v.address} />
                        </div>
                      </td>

                      {/* Voting power */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="h-1.5 rounded-full"
                            style={{
                              width: `${Math.min(Number(votingPowerPercent) * 2, 80)}px`,
                              background: "var(--accent-blue)",
                              opacity: 0.5,
                            }}
                          />
                          <span className="text-xs font-mono" style={{ color: "var(--text-secondary)" }}>
                            {votingPowerPercent}%
                          </span>
                        </div>
                      </td>

                      {/* Cumulative */}
                      <td className="px-4 py-3 text-xs font-mono" style={{ color: "var(--text-secondary)" }}>
                        {cumulativePercent}%
                      </td>

                      {/* Voted (prevote) */}
                      <td className="px-4 py-3 text-center">
                        {voted ? (
                          <span
                            className="inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold"
                            style={{ background: "rgba(63,185,80,0.15)", color: "var(--accent-green)" }}
                          >
                            ✓
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold"
                            style={{ background: "rgba(248,81,73,0.1)", color: "var(--accent-red)" }}
                          >
                            ✗
                          </span>
                        )}
                      </td>

                      {/* Precommit */}
                      {!heightParam && (
                        <td className="px-4 py-3 text-center">
                          {precommitted ? (
                            <span
                              className="inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold"
                              style={{ background: "rgba(63,185,80,0.15)", color: "var(--accent-green)" }}
                            >
                              ✓
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold"
                              style={{ background: "rgba(248,81,73,0.1)", color: "var(--accent-red)" }}
                            >
                              ✗
                            </span>
                          )}
                        </td>
                      )}

                      {/* Latest round */}
                      {!heightParam && (
                        <td className="px-4 py-3 text-center font-mono text-xs" style={{ color: "var(--text-secondary)" }}>
                          {round}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Votes by Round ── */}
        {dumpLoading ? null : dumpError ? (
          <p className="text-sm mt-4" style={{ color: "var(--accent-red)" }}>
            Error loading votes: {dumpError}
          </p>
        ) : Array.isArray(dumpConsensus?.result?.round_state?.votes) &&
          dumpConsensus.result.round_state.votes.length > 0 ? (
          <div
            className="rounded-xl border overflow-hidden"
            style={{ borderColor: "var(--border-default)" }}
          >
            <div
              className="px-5 py-3.5 border-b"
              style={{ background: "var(--bg-surface)", borderColor: "var(--border-default)" }}
            >
              <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                Votes by Round
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead>
                  <tr style={{ background: "var(--bg-elevated)", borderBottom: "1px solid var(--border-default)" }}>
                    {["Round", "Prevotes Bit Array", "Precommits Bit Array"].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left font-semibold uppercase tracking-wider"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dumpConsensus.result.round_state.votes.map((vote: any, idx: number) => (
                    <tr
                      key={idx}
                      style={{
                        background: "var(--bg-primary)",
                        borderBottom: "1px solid var(--border-subtle)",
                      }}
                    >
                      <td className="px-4 py-2.5 font-mono" style={{ color: "var(--text-secondary)" }}>
                        {vote.round ?? idx}
                      </td>
                      <td className="px-4 py-2.5 font-mono break-all" style={{ color: "var(--text-muted)" }}>
                        {vote.prevotes_bit_array || "—"}
                      </td>
                      <td className="px-4 py-2.5 font-mono break-all" style={{ color: "var(--text-muted)" }}>
                        {vote.precommits_bit_array || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

      </main>

      <Footer />

      {/* ── Error Toast ── */}
      {errorMsg && (
        <div
          className="fixed bottom-5 right-5 px-5 py-3 rounded-xl shadow-xl z-50 flex items-center gap-3 border text-sm animate-slide-in-up"
          style={{
            background: "var(--bg-elevated)",
            borderColor: "rgba(248,81,73,0.4)",
            color: "var(--text-primary)",
          }}
        >
          <span style={{ color: "var(--accent-red)", fontWeight: 500 }}>Error</span>
          <span style={{ color: "var(--text-secondary)" }}>{errorMsg}</span>
          <button
            onClick={() => setErrorMsg(null)}
            className="ml-2 text-lg leading-none transition-colors"
            style={{ color: "var(--text-muted)" }}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
