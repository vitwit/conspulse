"use client";
import React from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";

export const NAV_ITEMS = [
  { label: "Consensus", key: "consensus", href: "/" },
  { label: "Netstats", key: "netstats", href: "/netstats" },
  { label: "Debug Consensus", key: "debug-consensus", href: "/debug-consensus" },
];

export default function Navbar() {
  const pathname = usePathname();
  return (
    <nav className="bg-white shadow px-4 py-3 mb-6">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/">
            <img src="/conspulse-logo.svg" alt="Conspulse Logo" className="h-9 w-9 cursor-pointer" />
          </Link>
          <Link href="/" className="font-bold text-xl tracking-wide text-blue-700 hover:no-underline cursor-pointer">
            Conspulse
          </Link>
        </div>
        <div className="flex gap-4">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className={`px-3 py-1 rounded hover:bg-blue-100 transition font-medium ${pathname === item.href ? "bg-blue-200 text-blue-900" : "text-gray-700"}`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
} 