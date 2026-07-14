"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Activity, Boxes, ArrowLeftRight, HeartPulse, Menu, X } from "lucide-react";

const NAV_ITEMS = [
  { label: "Heartbeat", key: "heartbeat", href: "/", icon: HeartPulse },
  { label: "Consensus", key: "consensus", href: "/consensus", icon: Activity },
  { label: "Blocks", key: "blocks", href: "/blocks", icon: Boxes },
  { label: "Transactions", key: "transactions", href: "/transactions", icon: ArrowLeftRight },
];

export default function Navbar(props: { shrink?: boolean }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`sticky top-0 z-50 border-b transition-all duration-300 ${
        scrolled
          ? "border-[var(--edge)] bg-[#05080f]/85 backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.35)]"
          : "border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-4 sm:px-6">
        {/* Left: Logo + Name + Network */}
        <div className="flex items-center gap-3">
          <Link href="/" className="group flex items-center gap-2.5">
            <span className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--edge)] bg-[var(--bg-panel)] transition-all group-hover:border-cyan-400/40 group-hover:shadow-[0_0_18px_rgba(34,211,238,0.25)]">
              <img src="/conspulse-logo.svg" alt="Conspulse" className="h-5 w-5" />
            </span>
            <span className="text-lg font-bold tracking-tight text-white">
              Cons<span className="text-gradient">pulse</span>
            </span>
          </Link>

          {process.env.NEXT_PUBLIC_NETWORK_NAME && (
            <span className="chip ml-2 hidden md:inline-flex">
              <span className="live-dot" />
              {process.env.NEXT_PUBLIC_NETWORK_NAME}
            </span>
          )}
        </div>

        {/* Right: Nav Links */}
        <div className="hidden items-center gap-1 sm:flex">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.key}
                href={item.href}
                className={`relative flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "text-white"
                    : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-100"
                }`}
              >
                <Icon size={15} className={isActive ? "text-cyan-400" : ""} />
                {item.label}
                {isActive && (
                  <span className="absolute inset-x-3 -bottom-[13px] h-[2px] rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 shadow-[0_0_8px_rgba(34,211,238,0.7)]" />
                )}
              </Link>
            );
          })}
        </div>

        {/* Hamburger */}
        <button
          onClick={() => setMenuOpen((p) => !p)}
          className="rounded-lg p-2 text-slate-300 transition-colors hover:bg-white/[0.06] hover:text-white sm:hidden"
          aria-label="Toggle Menu"
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile Menu */}
      <div
        className={`grid overflow-hidden transition-all duration-300 sm:hidden ${
          menuOpen ? "grid-rows-[1fr] border-t border-[var(--edge)] bg-[#05080f]/95 backdrop-blur-xl" : "grid-rows-[0fr]"
        }`}
      >
        <div className="min-h-0">
          <div className="space-y-1 px-4 py-3">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-cyan-400/10 text-cyan-300"
                      : "text-slate-300 hover:bg-white/[0.05] hover:text-white"
                  }`}
                >
                  <Icon size={16} />
                  {item.label}
                </Link>
              );
            })}
            {process.env.NEXT_PUBLIC_NETWORK_NAME && (
              <div className="px-3 pt-2">
                <span className="chip">
                  <span className="live-dot" />
                  {process.env.NEXT_PUBLIC_NETWORK_NAME}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
