import React from "react";
import {
  faTwitter,
  faTelegram,
  faGithub,
} from "@fortawesome/free-brands-svg-icons";
import { faEnvelope } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

const NETWORK_NAME = process.env.NEXT_PUBLIC_NETWORK_NAME || "the network";

const NAV_LINKS = [
  { label: "Heartbeat",    href: "/" },
  { label: "Consensus",    href: "/consensus" },
  { label: "Blocks",       href: "/blocks" },
  { label: "Transactions", href: "/transactions" },
];

const SOCIALS = [
  { icon: faEnvelope, href: "mailto:contact@vitwit.com",      label: "Email" },
  { icon: faTelegram, href: "https://t.me/vitwit",            label: "Telegram" },
  { icon: faTwitter,  href: "https://twitter.com/vitwit",     label: "Twitter" },
  { icon: faGithub,   href: "https://github.com/vitwit",      label: "GitHub" },
];

export default function Footer() {
  return (
    <footer
      className="mt-auto border-t"
      style={{ background: "var(--bg-surface)", borderColor: "var(--border-default)" }}
    >
      <div className="max-w-[1400px] mx-auto px-6 py-10">
        {/* Top grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-10">

          {/* Brand column */}
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <img src="/conspulse-logo.svg" alt="Conspulse" className="h-7 w-7" />
              <span
                className="font-semibold text-[15px]"
                style={{ color: "var(--text-primary)" }}
              >
                Conspulse
              </span>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              A real-time consensus dashboard for Tendermint&nbsp;/&nbsp;CometBFT networks.
              Monitor{" "}
              <span style={{ color: "var(--accent-blue)" }}>{NETWORK_NAME}</span>{" "}
              performance, validator health, and network activity — all in one place.
            </p>
          </div>

          {/* Navigation column */}
          <div>
            <h4
              className="text-xs font-semibold uppercase tracking-wider mb-4"
              style={{ color: "var(--text-secondary)" }}
            >
              Navigation
            </h4>
            <ul className="space-y-2.5">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-sm transition-colors"
                    style={{ color: "var(--text-secondary)" }}
                    onMouseEnter={(e) =>
                      ((e.currentTarget as HTMLElement).style.color = "var(--text-primary)")
                    }
                    onMouseLeave={(e) =>
                      ((e.currentTarget as HTMLElement).style.color = "var(--text-secondary)")
                    }
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Connect column */}
          <div>
            <h4
              className="text-xs font-semibold uppercase tracking-wider mb-4"
              style={{ color: "var(--text-secondary)" }}
            >
              Connect
            </h4>

            {/* Social icons */}
            <div className="flex gap-4 mb-5">
              {SOCIALS.map(({ icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="transition-all"
                  style={{ color: "var(--text-secondary)" }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.color = "var(--text-primary)";
                    (e.currentTarget as HTMLElement).style.transform = "scale(1.1)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)";
                    (e.currentTarget as HTMLElement).style.transform = "scale(1)";
                  }}
                >
                  <FontAwesomeIcon icon={icon} size="lg" />
                </a>
              ))}
            </div>

            <div className="space-y-2 text-sm" style={{ color: "var(--text-secondary)" }}>
              <div>
                Powered by{" "}
                <a
                  href="https://vitwit.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium transition-colors hover:underline"
                  style={{ color: "var(--accent-blue)" }}
                >
                  Vitwit
                </a>
              </div>
              <div className="flex items-center gap-1">
                Supported by{" "}
                <a
                  href="https://polygon.technology"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium transition-colors hover:underline inline-flex items-center gap-1 ml-1"
                  style={{ color: "var(--accent-purple)" }}
                >
                  Polygon
                  <img src="/polygon-logo.svg" alt="" className="h-3.5 w-3.5 inline" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          className="border-t mt-8 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            © {new Date().getFullYear()} Vitwit. Open source infrastructure for the Cosmos ecosystem.
          </p>
          <a
            href="https://staking.polygon.technology/validators/50"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs px-4 py-1.5 rounded-full border font-medium transition-all"
            style={{
              color: "var(--accent-green)",
              borderColor: "rgba(63, 185, 80, 0.35)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = "rgba(63, 185, 80, 0.65)";
              (e.currentTarget as HTMLElement).style.background = "rgba(63, 185, 80, 0.06)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = "rgba(63, 185, 80, 0.35)";
              (e.currentTarget as HTMLElement).style.background = "transparent";
            }}
          >
            Delegate to Vitwit Validator →
          </a>
        </div>
      </div>
    </footer>
  );
}
