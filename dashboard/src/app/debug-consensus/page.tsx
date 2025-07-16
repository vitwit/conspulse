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
  const pathname = usePathname();
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

      <main className="flex-1 mt-4">
        <section className="p-4 sm:p-8 max-w-5xl mx-auto bg-[#1a1e24] rounded-xl shadow-lg mb-8 border border-[#2a2f3a]">
          <h1 className="text-2xl font-bold mb-2 text-blue-400">Debug Consensus / AppHash Mismatch</h1>
          <p className="mb-6 text-gray-400 whitespace-pre-line">{description}</p>

          <button
            type="button"
            className="mb-4 bg-[#2a2f3a] hover:bg-[#394150] text-white px-4 py-2 rounded font-semibold transition border border-[#3a3f4a]"
            onClick={() => {
              setSource1("https://raw.githubusercontent.com/vitwit/conspulse/refs/heads/temp/heimdallv2backup.zip");
              setSource2("https://raw.githubusercontent.com/vitwit/conspulse/refs/heads/temp/heimdallv2.backup.zip");
            }}
          >
            Fill Test Data
          </button>

          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <label className="font-semibold">Source 1</label>
              <input
                type="text"
                value={source1}
                onChange={(e) => setSource1(e.target.value)}
                placeholder="Path or URL to data or .zip file"
                className="bg-[#0e1014] border border-[#3a3f4a] text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 placeholder:text-gray-500 w-full"
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-semibold">Source 2</label>
              <input
                type="text"
                value={source2}
                onChange={(e) => setSource2(e.target.value)}
                placeholder="Path or URL to data or .zip file"
                className="bg-[#0e1014] border border-[#3a3f4a] text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 placeholder:text-gray-500 w-full"
                required
              />
            </div>

            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-2">
                <label className="font-semibold">Max Diffs Per Store</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={options.max_diffs_per_store}
                  onChange={(e) =>
                    setOptions({ ...options, max_diffs_per_store: Number(e.target.value) })
                  }
                  className="bg-[#0e1014] border border-[#3a3f4a] text-white px-3 py-2 rounded-lg w-20 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={options.show_matching_stores}
                  onChange={(e) =>
                    setOptions({ ...options, show_matching_stores: e.target.checked })
                  }
                  className="h-5 w-5 text-blue-500 rounded focus:ring-blue-500 border border-gray-600 bg-[#1a1e24]"
                />
                Show Matching Stores
              </label>

              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={options.detailed_output}
                  onChange={(e) =>
                    setOptions({ ...options, detailed_output: e.target.checked })
                  }
                  className="h-5 w-5 text-blue-500 rounded focus:ring-blue-500 border border-gray-600 bg-[#1a1e24]"
                />
                Detailed Output
              </label>
            </div>

            <div className="flex justify-center">
              <button
                type="submit"
                className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50"
                disabled={loading}
              >
                {loading ? "Debugging..." : "Debug State"}
              </button>
            </div>
          </form>

          {error && <div className="bg-red-800 text-red-100 p-3 rounded mt-4">{error}</div>}
        </section>
      </main>

      <Footer />
    </div>
  );
}
