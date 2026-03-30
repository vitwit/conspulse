"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";


const NAV_ITEMS = [
  { label: "Heartbeat", key: "heartbeat", href: "/" },
  { label: "Blocks", key: "blocks", href: "/blocks" },
  { label: "Transactions", key: "transactions", href: "/transactions" },
  { label: "Consensus", key: "consensus", href: "/consensus" },
  { label: "Debug Consensus", key: "debug-consensus", href: "/debug-consensus" },
];

export default function Navbar(props: { shrink: boolean }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const toggleMenu = () => setMenuOpen((prev) => !prev);

  return (
    <nav className="bg-[#13161c] border-b border-[#2a2f3a] px-4 py-3 shadow-sm">
      <div
        className={`${props.shrink ? "max-w-5xl" : ""} mx-auto flex items-center justify-between relative`}
      >
        {/* Left: Logo + Name */}
        <div className="flex items-center gap-3">
          <Link href="/">
            <img
              src="/conspulse-logo.svg"
              alt="Conspulse Logo"
              className="h-8 w-8 hover:opacity-90 transition cursor-pointer"
            />
          </Link>
          <Link
            href="/"
            className="text-xl font-bold text-white tracking-wide hover:text-cyan-400 transition"
          >
            Conspulse
          </Link>
        </div>

        {/* Center: Network Name */}
        <div className="absolute left-1/2 transform -translate-x-1/2 text-sm font-medium text-blue-300 bg-blue-900/30 rounded px-3 py-1 ml-0 sm:ml-3 mt-1 sm:mt-0 border border-blue-600 hover:text-white tracking-wide hidden sm:block">
          {process.env.NEXT_PUBLIC_NETWORK_NAME}
        </div>

        {/* Right: Nav Links (hidden on mobile) + Hamburger */}
        <div className="flex items-center gap-2">
          {/* Nav Links for larger screens */}
          <div className="hidden sm:flex gap-2">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${isActive
                      ? "underline text-green-500/90 hover:bg-green-500/10"
                      : "text-gray-200 hover:text-white hover:bg-green-500/10"
                    }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>

          {/* Hamburger Icon for mobile */}
          <button
            onClick={toggleMenu}
            className="sm:hidden text-gray-300 hover:text-white focus:outline-none hover:cursor-pointer"
            aria-label="Toggle Menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="sm:hidden mt-3 px-4">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.key}
                href={item.href}
                className={`block px-4 py-2 rounded-md text-sm font-semibold transition-all ${isActive
                    ? "bg-cyan-700 text-white"
                    : "text-gray-200 hover:text-white hover:bg-[#1f2430]"
                  }`}
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </nav>
  );
}
