"use client";
import React, { useState } from "react";
import { usePathname } from "next/navigation";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { SupportUS } from "../components/SupportUs";

const description = `
This tool helps you debug consensus and apphash mismatch errors between two Cosmos SDK node databases. It uses the API provided by the iavlviewer backend to compare two data sources (local directories, zip files, or URLs) and outputs detailed differences in store contents, hashes, and keys.

To use this tool, provide the required information for both sources below. The tool will call the backend API and display a human-readable comparison, highlighting any mismatches or missing data.
`;

const API_URL = process.env.NEXT_PUBLIC_SCRIPT_API_URL || "/api";

export default function DebugConsensusPage() {
  const [source1, setSource1] = useState("");
  const [source2, setSource2] = useState("");
  const [options, setOptions] = useState({
    max_diffs_per_store: 5,
    show_matching_stores: true,
    detailed_output: true,
  });
  const [output, setOutput] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

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
    <div className="min-h-screen bg-[#0e1014] flex flex-col text-white font-sans">
      <SupportUS />
      <Navbar shrink={false} />

      <main className="flex-1 mt-4 px-12">
        <section className="p-4 sm:p-8 mx-auto bg-[#1a1e24] rounded-xl shadow-lg mb-8 border border-[#2a2f3a]">
          <h1 className="text-2xl font-bold mb-2 text-green-500">Debug Consensus / AppHash Mismatch</h1>
          <p className="mb-6 text-gray-400 whitespace-pre-line">{description}</p>

          <button
            type="button"
            className="mb-4 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-semibold transition border border-green-700"
            onClick={() => {
              setSource1("https://raw.githubusercontent.com/vitwit/conspulse/refs/heads/temp/heimdallv2backup.zip");
              setSource2("https://raw.githubusercontent.com/vitwit/conspulse/refs/heads/temp/heimdallv2.backup.zip");
            }}
          >
            Fill Test Data
          </button>

          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <label className="font-semibold text-gray-400">Source 1</label>
              <input
                type="text"
                value={source1}
                onChange={(e) => setSource1(e.target.value)}
                placeholder="Path or URL to data or .zip file"
                className="bg-[#0e1014] border border-[#3a3f4a] text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 placeholder:text-gray-500 w-full"
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-semibold text-gray-400">Source 2</label>
              <input
                type="text"
                value={source2}
                onChange={(e) => setSource2(e.target.value)}
                placeholder="Path or URL to data or .zip file"
                className="bg-[#0e1014] border border-[#3a3f4a] text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 placeholder:text-gray-500 w-full"
                required
              />
            </div>

            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-2">
                <label className="font-semibold text-gray-400">Max Diffs Per Store</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={options.max_diffs_per_store}
                  onChange={(e) =>
                    setOptions({ ...options, max_diffs_per_store: Number(e.target.value) })
                  }
                  className="bg-[#0e1014] border border-[#3a3f4a] text-white px-3 py-2 rounded-lg w-20 focus:outline-none focus:ring-2 focus:ring-green-600"
                />
              </div>

              <label className="inline-flex items-center gap-2 text-sm text-gray-300">
                <input
                  type="checkbox"
                  checked={options.show_matching_stores}
                  onChange={(e) =>
                    setOptions({ ...options, show_matching_stores: e.target.checked })
                  }
                  className="h-5 w-5 accent-green-500 focus:ring-green-500 border border-gray-600 bg-[#1a1e24]"
                />
                Show Matching Stores
              </label>

              <label className="inline-flex items-center gap-2 text-sm text-gray-300">
                <input
                  type="checkbox"
                  checked={options.detailed_output}
                  onChange={(e) =>
                    setOptions({ ...options, detailed_output: e.target.checked })
                  }
                  className="h-5 w-5 accent-green-500 focus:ring-green-500 border border-gray-600 bg-[#1a1e24]"
                />
                Detailed Output
              </label>
            </div>

            <div className="flex justify-center">
              <button
                type="submit"
                className="bg-green-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-50"
                disabled={loading}
              >
                {loading ? "Debugging..." : "Debug State"}
              </button>
            </div>
          </form>

          {error && <div className="bg-red-800 text-red-100 p-3 rounded mt-4">{error}</div>}

          {/* output rendering below remains unchanged */}
          {output && (
            <div className="mt-8">
              <h2 className="text-2xl font-bold mb-6 text-green-400">Comparison Output</h2>

              {/* Summary Boxes */}
              <div className="mb-4 grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                <div className="bg-[#1f2a36] text-green-400 border border-green-700 rounded p-2 flex flex-col items-center">
                  <span className="text-xs text-gray-400">Total Stores</span>
                  <span className="font-bold">{output.summary?.total_stores}</span>
                </div>
                <div className="bg-[#1d2a1f] text-green-300 border border-green-700 rounded p-2 flex flex-col items-center">
                  <span className="text-xs text-gray-400">Matching</span>
                  <span className="font-bold">{output.summary?.matching_stores}</span>
                </div>
                <div className="bg-[#2a1e1e] text-red-400 border border-red-700 rounded p-2 flex flex-col items-center">
                  <span className="text-xs text-gray-400">Differing</span>
                  <span className="font-bold">{output.summary?.differing_stores}</span>
                </div>
                <div className="bg-[#2a2f3a] text-gray-400 border border-gray-600 rounded p-2 flex flex-col items-center">
                  <span className="text-xs text-gray-400">Missing</span>
                  <span className="font-bold">{output.summary?.missing_stores}</span>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm border border-[#3a3f4a] rounded overflow-hidden">
                  <thead>
                    <tr className="bg-[#2a2f3a] text-gray-200">
                      <th className="px-3 py-2 text-left font-bold hover:text-zinc-400 transition text-zinc-500/90">Store</th>
                      <th className="px-3 py-2 text-left font-bold hover:text-zinc-400 transition text-zinc-500/90">Status</th>
                      <th className="px-3 py-2 text-left font-bold hover:text-zinc-400 transition text-zinc-500/90">Hash 1</th>
                      <th className="px-3 py-2 text-left font-bold hover:text-zinc-400 transition text-zinc-500/90">Hash 2</th>
                      <th className="px-3 py-2 text-left font-bold hover:text-zinc-400 transition text-zinc-500/90">Type 1</th>
                      <th className="px-3 py-2 text-left font-bold hover:text-zinc-400 transition text-zinc-500/90">Type 2</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Define types and maps */}
                    {(() => {
                      type StoreStatus = 'match' | 'differ' | 'missing_source1' | 'missing_source2';

                      const statusOrder: Record<StoreStatus, number> = {
                        differ: 0,
                        missing_source1: 0,
                        missing_source2: 0,
                        match: 1,
                      };

                      const statusLabelMap: Record<StoreStatus, string> = {
                        match: 'Match',
                        differ: 'Differ',
                        missing_source1: 'Missing in Source 1',
                        missing_source2: 'Missing in Source 2',
                      };

                      return [...output.results]
                        .sort((a, b) => {
                          const aOrder = statusOrder[a.status as StoreStatus] ?? 2;
                          const bOrder = statusOrder[b.status as StoreStatus] ?? 2;
                          return aOrder - bOrder;
                        })
                        .map((res) => {
                          const status = res.status as StoreStatus;
                          let rowClass = '';
                          if (status === 'match') rowClass = 'bg-[#1a2a1a]';
                          else if (status === 'differ') rowClass = 'bg-[#2a1a1a]';
                          else rowClass = 'bg-[#1a1e24]';

                          return (
                            <React.Fragment key={res.name}>
                              <tr className={`${rowClass} border-b border-[#2a2f3a]`}>
                                <td className="px-3 py-2 font-mono font-semibold">{res.name}</td>
                                <td className="px-3 py-2 font-bold">
                                  <span
                                    className={
                                      status === 'match'
                                        ? 'text-green-400'
                                        : status === 'differ'
                                          ? 'text-red-400'
                                          : 'text-gray-400'
                                    }
                                  >
                                    {statusLabelMap[status] || status}
                                  </span>
                                  {res.extra && (
                                    <button
                                      type="button"
                                      className="ml-2 text-xs text-blue-400 underline hover:text-blue-300 focus:outline-none"
                                      onClick={() =>
                                        setExpandedRows((prev) => ({
                                          ...prev,
                                          [res.name]: !prev[res.name],
                                        }))
                                      }
                                    >
                                      {expandedRows[res.name] ? 'Hide Details' : 'Show Details'}
                                    </button>
                                  )}
                                </td>
                                <td className="px-3 py-2 font-mono break-all text-xs text-gray-300">
                                  {res.hash1 || <span className="text-gray-500">—</span>}
                                </td>
                                <td className="px-3 py-2 font-mono break-all text-xs text-gray-300">
                                  {res.hash2 || <span className="text-gray-500">—</span>}
                                </td>
                                <td className="px-3 py-2 font-mono text-xs text-gray-300">
                                  {res.store_type1 || <span className="text-gray-500">—</span>}
                                </td>
                                <td className="px-3 py-2 font-mono text-xs text-gray-300">
                                  {res.store_type2 || <span className="text-gray-500">—</span>}
                                </td>
                              </tr>
                              {res.extra && expandedRows[res.name] && (
                                <tr className="bg-[#1e222a]">
                                  <td colSpan={6} className="px-4 py-3 border-t border-[#3a3f4a]">
                                    <pre className="whitespace-pre-wrap text-xs font-mono bg-[#0e1014] text-gray-300 rounded p-3 overflow-x-auto border border-blue-900">
                                      {res.extra}
                                    </pre>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        });
                    })()}
                  </tbody>
                </table>
              </div>

              {/* Metadata section */}
              <div className="mt-6 text-xs text-gray-400 border-t border-[#2a2f3a] pt-4">
                <div>
                  Source1 Version:{' '}
                  <span className="font-mono text-white">{output.metadata?.source1_version}</span>
                </div>
                <div>
                  Source2 Version:{' '}
                  <span className="font-mono text-white">{output.metadata?.source2_version}</span>
                </div>
                <div>
                  Comparison Time:{' '}
                  <span className="font-mono text-white">{output.metadata?.comparison_time}</span>
                </div>
                <div>
                  Processing Time:{' '}
                  <span className="font-mono text-white">{output.metadata?.processing_time}</span>
                </div>
              </div>
            </div>
          )}

        </section>
      </main>

      <Footer />
    </div>
  );
}
