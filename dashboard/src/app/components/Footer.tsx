import React from "react";
import {
  faTwitter,
  faTelegram,
  faGithub,
} from "@fortawesome/free-brands-svg-icons";
import { faEnvelope } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

const NETWORK_NAME = process.env.NEXT_PUBLIC_NETWORK_NAME || "the network";

const SOCIALS = [
  { href: "mailto:contact@vitwit.com", icon: faEnvelope, label: "Email" },
  { href: "https://t.me/vitwit", icon: faTelegram, label: "Telegram" },
  { href: "https://twitter.com/vitwit", icon: faTwitter, label: "Twitter" },
  { href: "https://github.com/vitwit", icon: faGithub, label: "GitHub" },
];

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-[var(--edge)] bg-[#04060c]/80">
      <div className="mx-auto max-w-[1600px] px-6 pb-8 pt-12">
        <div className="flex flex-col justify-between gap-10 sm:flex-row">
          {/* Left: About */}
          <div className="max-w-xl">
            <div className="mb-4 flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--edge)] bg-[var(--bg-panel)]">
                <img src="/conspulse-logo.svg" alt="Conspulse Logo" className="h-5 w-5" />
              </span>
              <span className="text-lg font-bold tracking-tight text-white">
                Cons<span className="text-gradient">pulse</span>
              </span>
            </div>
            <p className="text-sm leading-relaxed text-slate-400">
              A real-time consensus dashboard for Tendermint (CometBFT) based networks like{" "}
              <span className="font-semibold text-cyan-400">{NETWORK_NAME}</span>. Live consensus
              state, validator tracking, and network insights to monitor performance and health.
            </p>
            <p className="mt-3 text-sm text-slate-500">
              Support us by delegating to the{" "}
              <a
                href="https://staking.polygon.technology/validators/50"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-cyan-400 transition-colors hover:text-cyan-300"
              >
                Vitwit Validator
              </a>
              .
            </p>
          </div>

          {/* Right: Socials and Attribution */}
          <div className="flex flex-col items-start gap-4 sm:items-end">
            <div className="flex gap-2">
              {SOCIALS.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--edge)] bg-[var(--bg-panel)] text-slate-400 transition-all duration-200 hover:-translate-y-0.5 hover:border-cyan-400/40 hover:text-cyan-300 hover:shadow-[0_0_16px_rgba(34,211,238,0.15)]"
                >
                  <FontAwesomeIcon icon={s.icon} />
                </a>
              ))}
            </div>

            <div className="flex flex-col gap-1.5 text-sm text-slate-500 sm:items-end">
              <span>
                Powered by{" "}
                <a
                  href="https://vitwit.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-cyan-400 transition-colors hover:text-cyan-300"
                >
                  Vitwit
                </a>
              </span>
              <span className="flex items-center gap-1.5">
                Supported by{" "}
                <a
                  href="https://polygon.technology"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 font-semibold text-purple-400 transition-colors hover:text-purple-300"
                >
                  Polygon
                  <img src="/polygon-logo.svg" alt="Polygon Logo" className="h-4 w-4" />
                </a>
              </span>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-[var(--edge)] pt-5 text-center text-xs text-slate-600">
          © {new Date().getFullYear()} Conspulse — Tendermint Validator Dashboard
        </div>
      </div>
    </footer>
  );
}
