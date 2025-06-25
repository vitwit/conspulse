"use client";
import React, { useState } from "react";
import { usePathname } from "next/navigation";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

// Description for the page
const description = `
This tool helps you debug consensus and apphash mismatch errors between two Cosmos SDK node databases. It uses the API provided by the iavlviewer backend to compare two data sources (local directories, zip files, or URLs) and outputs detailed differences in store contents, hashes, and keys.

To use this tool, provide the required information for both sources below. The tool will call the backend API and display a human-readable comparison, highlighting any mismatches or missing data.
`;

const API_URL = process.env.NEXT_PUBLIC_SCRIPT_API_URL || "/api";

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
      <Footer />
    </div>
  );
} 