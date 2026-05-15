"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";

const NAV_ITEMS = [
  { label: "Heartbeat",     key: "heartbeat",     href: "/" },
  { label: "Consensus",     key: "consensus",     href: "/consensus" },
  { label: "Blocks",        key: "blocks",        href: "/blocks" },
  { label: "Transactions",  key: "transactions",  href: "/transactions" },
];

export default function Navbar(props: { shrink: boolean }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav
      className="sticky top-0 z-50 border-b"
      style={{
        background: "var(--bg-surface)",
        borderColor: "var(--border-default)",
      }}
    >
      <div
        className={`${props.shrink ? "max-w-5xl" : "max-w-[1400px]"} mx-auto px-4 sm:px-6`}
      >
        <div className="flex items-center justify-between h-16">

          {/* ── Logo + Network Badge ── */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <Link href="/" className="flex items-center gap-2.5 group">
              {/* Logo with live pulse ring */}
              <div className="relative">
                <img
                  src="/conspulse-logo.svg"
                  alt="Conspulse"
                  className="h-8 w-8 transition-opacity group-hover:opacity-80"
                />
                <span
                  className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 animate-pulse"
                  style={{
                    background: "var(--accent-green)",
                    borderColor: "var(--bg-surface)",
                  }}
                />
              </div>
              <span
                className="font-semibold text-[15px] tracking-tight hidden sm:block transition-colors group-hover:opacity-90"
                style={{ color: "var(--text-primary)" }}
              >
                Conspulse
              </span>
            </Link>

            {/* Network badge */}
            {process.env.NEXT_PUBLIC_NETWORK_NAME && (
              <div
                className="hidden sm:flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border"
                style={{
                  background: "rgba(56, 139, 253, 0.08)",
                  borderColor: "rgba(56, 139, 253, 0.25)",
                  color: "var(--accent-blue)",
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full animate-pulse"
                  style={{ background: "var(--accent-blue)" }}
                />
                {process.env.NEXT_PUBLIC_NETWORK_NAME}
              </div>
            )}
          </div>

          {/* ── Desktop Nav Links ── */}
          <div className="hidden sm:flex items-center gap-0.5">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className="relative px-4 py-2 text-sm font-medium rounded-md transition-all duration-200"
                  style={{
                    color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                    background: isActive ? "var(--bg-elevated)" : "transparent",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      (e.currentTarget as HTMLElement).style.color = "var(--text-primary)";
                      (e.currentTarget as HTMLElement).style.background = "rgba(33,38,45,0.6)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)";
                      (e.currentTarget as HTMLElement).style.background = "transparent";
                    }
                  }}
                >
                  {item.label}
                  {isActive && (
                    <span
                      className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full"
                      style={{ background: "var(--accent-blue)" }}
                    />
                  )}
                </Link>
              );
            })}
          </div>

          {/* ── Mobile Hamburger ── */}
          <button
            onClick={() => setMenuOpen((p) => !p)}
            className="sm:hidden p-2 rounded-md transition-colors"
            style={{ color: "var(--text-secondary)" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.color = "var(--text-primary)";
              (e.currentTarget as HTMLElement).style.background = "var(--bg-elevated)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)";
              (e.currentTarget as HTMLElement).style.background = "transparent";
            }}
            aria-label="Toggle menu"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* ── Mobile Menu ── */}
      {menuOpen && (
        <div
          className="sm:hidden border-t px-4 py-3 space-y-1"
          style={{
            background: "var(--bg-surface)",
            borderColor: "var(--border-default)",
          }}
        >
          {process.env.NEXT_PUBLIC_NETWORK_NAME && (
            <div
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border mb-3 w-fit"
              style={{
                background: "rgba(56, 139, 253, 0.08)",
                borderColor: "rgba(56, 139, 253, 0.25)",
                color: "var(--accent-blue)",
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ background: "var(--accent-blue)" }}
              />
              {process.env.NEXT_PUBLIC_NETWORK_NAME}
            </div>
          )}
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.key}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors"
                style={{
                  color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                  background: isActive ? "var(--bg-elevated)" : "transparent",
                }}
              >
                {isActive && (
                  <span
                    className="w-1 h-4 rounded-full flex-shrink-0"
                    style={{ background: "var(--accent-blue)" }}
                  />
                )}
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </nav>
  );
}
