import React, { useState } from "react";
import { Sparkles, X } from "lucide-react";

export const SupportUS = () => {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <div className="relative overflow-hidden border-b border-[var(--edge)] bg-gradient-to-r from-cyan-500/[0.07] via-transparent to-emerald-500/[0.07] px-4 py-2 text-center text-sm text-slate-300 sm:px-6">
      <span className="inline-flex items-center gap-2">
        <Sparkles size={14} className="text-cyan-400" />
        Support us by delegating to the
        <a
          href="https://staking.polygon.technology/validators/50"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-cyan-400 underline decoration-cyan-400/40 underline-offset-4 transition-colors hover:text-cyan-300"
        >
          Vitwit Validator
        </a>
      </span>

      <button
        onClick={() => setVisible(false)}
        className="absolute right-4 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 transition-colors hover:bg-white/[0.06] hover:text-white"
        aria-label="Close banner"
      >
        <X size={14} />
      </button>
    </div>
  );
};
