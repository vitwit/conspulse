"use client";

import React, { useState } from "react";

export const SupportUS = () => {
  const [visible, setVisible] = useState(true);
  if (!visible) return null;

  return (
    <div
      className="relative text-center py-2.5 px-10 text-sm border-b overflow-hidden"
      style={{
        background: "linear-gradient(90deg, var(--bg-primary) 0%, #0d2044 50%, var(--bg-primary) 100%)",
        borderColor: "rgba(56, 139, 253, 0.2)",
      }}
    >
      {/* Subtle shimmer overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(88,166,255,0.04) 50%, transparent 100%)",
        }}
      />

      <p className="relative" style={{ color: "var(--text-secondary)" }}>
        Support us by delegating to the{" "}
        <a
          href="https://staking.polygon.technology/validators/50"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold transition-colors hover:underline underline-offset-2"
          style={{ color: "var(--accent-blue)" }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLElement).style.color = "var(--text-primary)")
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLElement).style.color = "var(--accent-blue)")
          }
        >
          Vitwit Validator
        </a>{" "}
        on Polygon
      </p>

      <button
        onClick={() => setVisible(false)}
        className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded transition-colors text-base leading-none"
        style={{ color: "var(--text-muted)" }}
        onMouseEnter={(e) =>
          ((e.currentTarget as HTMLElement).style.color = "var(--text-secondary)")
        }
        onMouseLeave={(e) =>
          ((e.currentTarget as HTMLElement).style.color = "var(--text-muted)")
        }
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
};
