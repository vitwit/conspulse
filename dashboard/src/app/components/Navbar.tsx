"use client";
import React from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";

export const NAV_ITEMS = [
  { label: "Heartbeat", key: "heartbeat", href: "/" },
  { label: "Consensus", key: "consensus", href: "/consensus" },
  { label: "Debug Consensus", key: "debug-consensus", href: "/debug-consensus" },
];

export default function Navbar(props: { shrink: boolean }) {
  const pathname = usePathname();

  return (
    <nav className="bg-[#13161c] border-b border-[#2a2f3a] px-4 py-3 shadow-sm">
      <div className={`${props.shrink ? "max-w-5xl" : ""} mx-auto flex items-center justify-between`}>
        {/* Logo and Name */}
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

        {/* Navigation Tabs */}
        <div className="flex gap-2">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.key}
                href={item.href}
                className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${isActive
                    ? "bg-cyan-700 text-white"
                    : "text-gray-200 hover:text-white hover:bg-[#1f2430]"
                  }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
