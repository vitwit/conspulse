"use client";
import React, { useState } from "react";
import { usePathname } from "next/navigation";
import Navbar from "../components/Navbar";

// Description for the page
const description = `
This tool helps you debug consensus and apphash mismatch errors between two Cosmos SDK node databases. It uses the API provided by the iavlviewer backend to compare two data sources (local directories, zip files, or URLs) and outputs detailed differences in store contents, hashes, and keys.

To use this tool, provide the required information for both sources below. The tool will call the backend API and display a human-readable comparison, highlighting any mismatches or missing data.
`;

const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

export default function DebugConsensusPage() {
  const [source1, setSource1] = useState("");
  const [source2, setSource2] = useState("");
  const [options, setOptions] = useState({ max_diffs_per_store: 5, show_matching_stores: true, detailed_output: true });
  const [output, setOutput] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const pathname = usePathname();
  // Track expanded rows for extra details
  const [expandedRows, setExpandedRows] = useState<{ [storeName: string]: boolean }>({});

  // Helper to auto-detect type
  function detectSourceType(val: string) {
    if (/^https?:\/\//i.test(val)) return "zip_url";
    if (/\.zip$/i.test(val)) return "zip_file";
    return "local";
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setOutput(null);
    try {
      const type1 = detectSourceType(source1);
      const type2 = detectSourceType(source2);
      const res = await fetch(`${API_URL}/compare`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source1: { type: type1, path: source1, url: source1 },
          source2: { type: type2, path: source2, url: source2 },
          options,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setOutput(data);
    } catch (err: any) {
      setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

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
      <Navbar />
      <main className="flex-1">
        <section className="p-4 sm:p-8 max-w-5xl mx-auto bg-white rounded-xl shadow-lg mb-8">
          <h1 className="text-2xl font-bold mb-2 text-blue-800">Debug Consensus / AppHash Mismatch</h1>
          <p className="mb-6 text-gray-700 whitespace-pre-line">{description}</p>
          <form onSubmit={handleSubmit} className="rounded-lg p-0 mb-8 flex flex-col gap-4">
            <div>
              <label className="block font-semibold mb-1">Source 1</label>
              <input
                type="text"
                value={source1}
                onChange={e => setSource1(e.target.value)}
                placeholder={"/path/to/data OR /path/to/file.zip OR https://example.com/file.zip"}
                className="border rounded px-2 py-1 w-2/3"
                required
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Source 2</label>
              <input
                type="text"
                value={source2}
                onChange={e => setSource2(e.target.value)}
                placeholder={"/path/to/data OR /path/to/file.zip OR https://example.com/file.zip"}
                className="border rounded px-2 py-1 w-2/3"
                required
              />
            </div>
            <div className="flex gap-4 items-center">
              <label className="font-semibold">Max Diffs Per Store</label>
              <input
                type="number"
                min={1}
                max={20}
                value={options.max_diffs_per_store}
                onChange={e => setOptions({ ...options, max_diffs_per_store: Number(e.target.value) })}
                className="border rounded px-2 py-1 w-20"
              />
              <label className="ml-4">
                <input
                  type="checkbox"
                  checked={options.show_matching_stores}
                  onChange={e => setOptions({ ...options, show_matching_stores: e.target.checked })}
                  className="mr-1"
                />
                Show Matching Stores
              </label>
              <label className="ml-4">
                <input
                  type="checkbox"
                  checked={options.detailed_output}
                  onChange={e => setOptions({ ...options, detailed_output: e.target.checked })}
                  className="mr-1"
                />
                Detailed Output
              </label>
            </div>
            <button
              type="submit"
              className="bg-blue-600 text-white px-6 py-2 rounded font-semibold hover:bg-blue-700 transition w-fit"
              disabled={loading}
            >
              {loading ? "Comparing..." : "Compare"}
            </button>
          </form>
          {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}
          {output && (
            <div className="mt-8">
              <h2 className="text-2xl font-bold mb-6 text-blue-800">Comparison Output</h2>
              {/* Summary */}
              <div className="mb-4 grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                <div className="bg-blue-100 rounded p-2 flex flex-col items-center">
                  <span className="text-xs text-gray-600">Total Stores</span>
                  <span className="font-bold text-blue-900">{output.summary?.total_stores}</span>
                </div>
                <div className="bg-green-100 rounded p-2 flex flex-col items-center">
                  <span className="text-xs text-gray-600">Matching</span>
                  <span className="font-bold text-green-900">{output.summary?.matching_stores}</span>
                </div>
                <div className="bg-red-100 rounded p-2 flex flex-col items-center">
                  <span className="text-xs text-gray-600">Differing</span>
                  <span className="font-bold text-red-900">{output.summary?.differing_stores}</span>
                </div>
                <div className="bg-gray-200 rounded p-2 flex flex-col items-center">
                  <span className="text-xs text-gray-600">Missing</span>
                  <span className="font-bold text-gray-900">{output.summary?.missing_stores}</span>
                </div>
              </div>
              {/* Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm border rounded overflow-hidden">
                  <thead>
                    <tr className="bg-gray-100 text-gray-700">
                      <th className="px-3 py-2 text-left font-bold">Store</th>
                      <th className="px-3 py-2 text-left font-bold">Status</th>
                      <th className="px-3 py-2 text-left font-bold">Hash 1</th>
                      <th className="px-3 py-2 text-left font-bold">Hash 2</th>
                      <th className="px-3 py-2 text-left font-bold">Type 1</th>
                      <th className="px-3 py-2 text-left font-bold">Type 2</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Sort: unmatched first, then match */}
                    {output.results && [...output.results].sort((a, b) => {
                      const order: Record<string, number> = { differ: 0, missing_source1: 0, missing_source2: 0, match: 1 };
                      const aOrder = order[a.status as string] !== undefined ? order[a.status as string] : 2;
                      const bOrder = order[b.status as string] !== undefined ? order[b.status as string] : 2;
                      return aOrder - bOrder;
                    }).map((res, i) => {
                      let rowClass = "";
                      if (res.status === "match") rowClass = "bg-green-50";
                      else if (res.status === "differ") rowClass = "bg-red-50";
                      else rowClass = "bg-gray-100";
                      let statusLabel = res.status;
                      if (res.status === "match") statusLabel = "Match";
                      else if (res.status === "differ") statusLabel = "Differ";
                      else if (res.status === "missing_source1") statusLabel = "Missing in Source 1";
                      else if (res.status === "missing_source2") statusLabel = "Missing in Source 2";
                      return (
                        <React.Fragment key={res.name}>
                          <tr className={rowClass + " border-b last:border-b-0"}>
                            <td className="px-3 py-2 font-mono font-semibold">{res.name}</td>
                            <td className="px-3 py-2 font-bold">
                              <span className={
                                res.status === "match" ? "text-green-700" :
                                res.status === "differ" ? "text-red-700" :
                                "text-gray-700"
                              }>
                                {statusLabel}
                              </span>
                              {res.extra && (
                                <button
                                  type="button"
                                  className="ml-2 text-xs text-blue-700 underline hover:text-blue-900 focus:outline-none"
                                  onClick={() => setExpandedRows((prev) => ({ ...prev, [res.name]: !prev[res.name] }))}
                                >
                                  {expandedRows[res.name] ? "Hide Details" : "Show Details"}
                                </button>
                              )}
                            </td>
                            <td className="px-3 py-2 font-mono break-all text-xs">{res.hash1 || <span className="text-gray-400">—</span>}</td>
                            <td className="px-3 py-2 font-mono break-all text-xs">{res.hash2 || <span className="text-gray-400">—</span>}</td>
                            <td className="px-3 py-2 font-mono text-xs">{res.store_type1 || <span className="text-gray-400">—</span>}</td>
                            <td className="px-3 py-2 font-mono text-xs">{res.store_type2 || <span className="text-gray-400">—</span>}</td>
                          </tr>
                          {res.extra && expandedRows[res.name] && (
                            <tr className="bg-gray-50">
                              <td colSpan={6} className="px-4 py-3 border-t">
                                <pre className="whitespace-pre-wrap text-xs font-mono bg-gray-100 rounded p-3 overflow-x-auto border border-blue-200">
                                  {res.extra}
                                </pre>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {/* Metadata */}
              <div className="mt-4 text-xs text-gray-500">
                <div>Source1 Version: <span className="font-mono text-gray-700">{output.metadata?.source1_version}</span></div>
                <div>Source2 Version: <span className="font-mono text-gray-700">{output.metadata?.source2_version}</span></div>
                <div>Comparison Time: <span className="font-mono text-gray-700">{output.metadata?.comparison_time}</span></div>
                <div>Processing Time: <span className="font-mono text-gray-700">{output.metadata?.processing_time}</span></div>
              </div>
            </div>
          )}
        </section>
      </main>
      {/* Footer */}
      <footer className="w-full bg-gradient-to-r from-gray-50 to-blue-50 border-t mt-8 px-4 pt-8 pb-4 flex flex-col gap-4 text-gray-700 text-sm shadow-inner">
        <div className="max-w-5xl mx-auto w-full flex flex-col sm:flex-row justify-between items-start gap-8">
          {/* About Section Left */}
          <div className="flex-1 min-w-[220px] mb-4 sm:mb-0">
            <div className="flex items-center mb-2">
              <img src="/conspulse-logo.svg" alt="Conspulse Logo" className="h-10 w-10 mr-2" />
              <span className="font-bold text-lg text-blue-700 self-center">Conspulse</span>
            </div>
            <h3 className="font-semibold text-base text-blue-800 mb-1">About Conspulse</h3>
            <p className="text-gray-700 leading-relaxed">
              <span className="font-bold">Conspulse</span> is a Tendermint validator dashboard for <span className="font-semibold text-blue-700">the network</span>. It provides real-time consensus state, validator stats, and network insights, helping users and operators monitor validator performance and network health. Support us by delegating to the Vitwit validator!
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