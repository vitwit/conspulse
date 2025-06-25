"use client";
import React, { useEffect, useState, useRef, useCallback } from "react";

const NAV_ITEMS = [
  { label: "Consensus", key: "consensus" },
  { label: "Netstats", key: "netstats" },
  // Add more menu items as needed
];

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL;
const NETWORK_NAME = process.env.NEXT_PUBLIC_NETWORK_NAME || "";

console.log('RPC_URL',RPC_URL);

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
  } | null>(null);
  const [validators, setValidators] = useState<{ address: string; voting_power: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingValidators, setLoadingValidators] = useState(true);
  const [timer, setTimer] = useState(10);
  const [activeMenu, setActiveMenu] = useState("consensus");
  const [favourites, setFavourites] = useState<string[]>([]);
  const [sortByPower, setSortByPower] = useState<"desc" | "asc">("desc");
  const timerRef = useRef<NodeJS.Timeout | null>(null);

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
    try {
      const consensusRes = await fetch(`${RPC_URL}/consensus_state`);
      const consensusData = await consensusRes.json();
      setConsensus(consensusData.result.round_state);
      const { height } = parseHeightRoundStep(consensusData.result.round_state["height/round/step"] || "");
      setLoadingValidators(true);
      const validatorsRes = await fetch(`${RPC_URL}/validators?height=${height}`);
      const validatorsData = await validatorsRes.json();
      setValidators(validatorsData.result.validators);
      setLoadingValidators(false);
    } catch {
      setConsensus(null);
      setValidators([]);
      setLoadingValidators(false);
    }
    setLoading(false);
    setTimer(10);
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
    timerRef.current = setTimeout(() => setTimer((t) => t - 1), 1000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [timer]);

  // Summary fields
  let height = 0, round = 0, prevotes = 0, precommits = 0;
  if (consensus) {
    const parsed = parseHeightRoundStep(consensus["height/round/step"] || "");
    height = parsed.height;
    round = parsed.round;
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
      <nav className="bg-white shadow px-4 py-3 mb-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/conspulse-logo.svg" alt="Conspulse Logo" className="h-9 w-9" />
            <span className="font-bold text-xl tracking-wide text-blue-700">Conspulse</span>
          </div>
          <div className="flex gap-4">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.key}
                className={`px-3 py-1 rounded hover:bg-blue-100 transition font-medium ${activeMenu === item.key ? "bg-blue-200 text-blue-900" : "text-gray-700"}`}
                onClick={() => setActiveMenu(item.key)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <main className="flex-1">
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
            <div className="relative mb-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex flex-col items-center bg-blue-100 rounded-lg p-4 shadow-inner">
                  <span className="text-gray-600">Height</span>
                  <span className="text-xl font-bold text-blue-900">{height}</span>
                </div>
                <div className="flex flex-col items-center bg-green-100 rounded-lg p-4 shadow-inner">
                  <span className="text-gray-600">Latest Round</span>
                  <span className="text-xl font-bold text-green-900">{round}</span>
                </div>
                <div className="flex flex-col items-center bg-yellow-100 rounded-lg p-4 shadow-inner">
                  <span className="text-gray-600">Pre-votes (%)</span>
                  <span className="text-xl font-bold text-yellow-900">{prevotes}</span>
                </div>
                <div className="flex flex-col items-center bg-purple-100 rounded-lg p-4 shadow-inner">
                  <span className="text-gray-600">Pre-commits (%)</span>
                  <span className="text-xl font-bold text-purple-900">{precommits}</span>
                </div>
              </div>
              {loading && (
                <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-lg text-lg font-semibold z-10">Loading...</div>
              )}
            </div>

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
                      <th className="py-2 px-4 text-left">Favourite</th>
                      <th className="py-2 px-4 text-left">Validator Address</th>
                      <th className="py-2 px-4 text-left">Voting Power (%)</th>
                      <th className="py-2 px-4 text-left">Cumulative Voting Power (%)</th>
                      <th className="py-2 px-4 text-left">Voted</th>
                      <th className="py-2 px-4 text-left">Precommit</th>
                      <th className="py-2 px-4 text-left">Latest Round</th>
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
                          <td className="py-2 px-4 text-center">
                            <button
                              aria-label={favourites.includes(v.address) ? "Unfavourite" : "Favourite"}
                              onClick={() => toggleFavourite(v.address)}
                              className="text-xl focus:outline-none"
                            >
                              {favourites.includes(v.address) ? "★" : "☆"}
                            </button>
                          </td>
                          <td className="py-2 px-4 font-mono text-xs">{v.address}</td>
                          <td className="py-2 px-4">{votingPowerPercent}</td>
                          <td className="py-2 px-4">{cumulativePercent}</td>
                          <td className="py-2 px-4 text-center">{voted ? "✅" : "❌"}</td>
                          <td className="py-2 px-4 text-center">{precommitted ? "✅" : "❌"}</td>
                          <td className="py-2 px-4 text-center">{round}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {loadingValidators && (
                  <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-lg text-lg font-semibold z-10">
                    Loading validators...
                  </div>
                )}
              </div>
            </div>
          </section>
        )}
        {activeMenu === "netstats" && (
          <div className="p-8 text-center text-gray-500 text-lg">Netstats coming soon...</div>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full bg-gradient-to-r from-gray-50 to-blue-50 border-t mt-8 px-4 pt-8 pb-4 flex flex-col gap-4 text-gray-700 text-sm shadow-inner">
        <div className="max-w-6xl mx-auto w-full flex flex-col sm:flex-row justify-between items-start gap-8">
          {/* About Section Left */}
          <div className="flex-1 min-w-[220px] mb-4 sm:mb-0">
            <div className="flex items-center mb-2">
              <img src="/conspulse-logo.svg" alt="Conspulse Logo" className="h-10 w-10 mr-2" />
              <span className="font-bold text-lg text-blue-700 self-center">Conspulse</span>
            </div>
            <h3 className="font-semibold text-base text-blue-800 mb-1">About Conspulse</h3>
            <p className="text-gray-700 leading-relaxed">
              <span className="font-bold">Conspulse</span> is a Tendermint validator dashboard for <span className="font-semibold text-blue-700">{NETWORK_NAME || "the network"}</span>. It provides real-time consensus state, validator stats, and network insights, helping users and operators monitor validator performance and network health. Support us by delegating to the Vitwit validator!
            </p>
          </div>
          {/* Socials & Powered by Right */}
          <div className="flex-1 flex flex-col items-start sm:items-end gap-3">
            <div className="flex gap-5 mb-2">
              <a href="mailto:hello@vitwit.com" target="_blank" rel="noopener noreferrer" aria-label="Email" title="Email" className="hover:text-blue-600 transition-transform hover:scale-110">
                <svg width="26" height="26" fill="currentColor" viewBox="0 0 24 24"><path d="M1.5 4.75A2.25 2.25 0 0 1 3.75 2.5h16.5A2.25 2.25 0 0 1 22.5 4.75v14.5A2.25 2.25 0 0 1 20.25 21.5H3.75A2.25 2.25 0 0 1 1.5 19.25V4.75Zm2.25-.75a.75.75 0 0 0-.75.75v.637l8.25 6.188 8.25-6.188V4.75a.75.75 0 0 0-.75-.75H3.75Zm16.5 2.863-7.728 5.797a.75.75 0 0 1-.894 0L3.75 6.863V19.25a.75.75 0 0 0 .75.75h16.5a.75.75 0 0 0 .75-.75V6.863ZM3.75 4.75v.011V4.75Z"/></svg>
              </a>
              <a href="https://t.me/vitwit" target="_blank" rel="noopener noreferrer" aria-label="Telegram" title="Telegram" className="hover:text-blue-400 transition-transform hover:scale-110">
                <svg width="26" height="26" fill="currentColor" viewBox="0 0 24 24"><path d="M9.036 16.927c-.38 0-.313-.144-.444-.504l-1.11-3.662 8.52-5.04c.39-.222.6-.099.486.312l-1.452 6.6c-.108.444-.36.552-.732.342l-2.028-1.494-.978.942c-.108.108-.204.204-.42.204zm-2.232-1.98l.3 1.008c.06.192.12.264.252.264.06 0 .132-.024.216-.072l1.38-.888 2.1 1.548c.252.18.468.084.54-.216l1.452-6.6c.06-.252-.06-.36-.288-.24l-7.8 4.62c-.24.144-.24.348.048.432l1.98.576zm15.192-10.947c-1.2-1.2-3.144-1.2-4.344 0l-13.2 13.2c-1.2 1.2-1.2 3.144 0 4.344 1.2 1.2 3.144 1.2 4.344 0l13.2-13.2c1.2-1.2 1.2-3.144 0-4.344z"/></svg>
              </a>
              <a href="https://twitter.com/vitwit" target="_blank" rel="noopener noreferrer" aria-label="Twitter" title="Twitter" className="hover:text-blue-500 transition-transform hover:scale-110">
                <svg width="26" height="26" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557a9.93 9.93 0 0 1-2.828.775 4.932 4.932 0 0 0 2.165-2.724c-.951.564-2.005.974-3.127 1.195A4.92 4.92 0 0 0 16.616 3c-2.73 0-4.942 2.21-4.942 4.936 0 .39.045.765.127 1.124C7.728 8.89 4.1 6.89 1.671 3.905c-.427.722-.666 1.561-.666 2.475 0 1.708.87 3.216 2.188 4.099a4.904 4.904 0 0 1-2.237-.616c-.054 2.281 1.581 4.415 3.949 4.89-.386.104-.793.16-1.213.16-.297 0-.583-.028-.862-.08.584 1.823 2.28 3.15 4.29 3.187A9.867 9.867 0 0 1 0 21.543a13.94 13.94 0 0 0 7.548 2.209c9.057 0 14.009-7.496 14.009-13.986 0-.213-.005-.425-.014-.636A9.936 9.936 0 0 0 24 4.557z"/></svg>
              </a>
              <a href="https://github.com/vitwit" target="_blank" rel="noopener noreferrer" aria-label="GitHub" title="GitHub" className="hover:text-gray-900 transition-transform hover:scale-110">
                <svg width="26" height="26" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.373 0 12c0 5.303 3.438 9.8 8.205 11.387.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.726-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.09-.745.083-.729.083-.729 1.205.084 1.84 1.237 1.84 1.237 1.07 1.834 2.807 1.304 3.492.997.108-.775.418-1.305.762-1.605-2.665-.304-5.466-1.334-5.466-5.931 0-1.31.468-2.381 1.236-3.221-.124-.303-.535-1.523.117-3.176 0 0 1.008-.322 3.3 1.23a11.52 11.52 0 0 1 3.003-.404c1.018.005 2.045.138 3.003.404 2.291-1.553 3.297-1.23 3.297-1.23.653 1.653.242 2.873.119 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.803 5.625-5.475 5.921.43.371.823 1.102.823 2.222 0 1.606-.015 2.898-.015 3.293 0 .321.218.694.825.576C20.565 21.796 24 17.299 24 12c0-6.627-5.373-12-12-12z"/></svg>
              </a>
            </div>
            <div className="flex items-center gap-2 mt-2 text-gray-500">
              <span>Powered by</span>
              <a href="https://vitwit.com" target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-700 hover:underline">Vitwit</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
