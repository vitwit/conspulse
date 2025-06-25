"use client";
import React from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const description = `
The Netstats page will provide real-time network statistics, peer information, and connectivity insights for your Tendermint-based blockchain. Stay tuned for live charts, peer lists, and more network health metrics!
`;

export default function NetstatsPage() {
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
      <Navbar />
      <main className="flex-1">
        <section className="p-4 sm:p-8 max-w-5xl mx-auto bg-white rounded-xl shadow-lg mb-8">
          <h1 className="text-2xl font-bold mb-2 text-blue-800">Netstats</h1>
          <p className="mb-6 text-gray-700 whitespace-pre-line">{description}</p>
          <div className="rounded-lg p-8 text-center text-gray-500 text-lg">
            Netstats coming soon...
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
} 