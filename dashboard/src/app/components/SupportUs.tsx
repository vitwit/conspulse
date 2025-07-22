import React, { useState } from "react";

export const SupportUS = () => {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <div className="w-full bg-[#1a1e24] text-gray-200 text-center py-2.5 px-6 font-medium text-sm border-b border-[#2a2f3a] relative">
      Support us by delegating to
      <a
        href="https://staking.polygon.technology/validators/50"
        target="_blank"
        rel="noopener noreferrer"
        className="ml-2 text-cyan-400 font-semibold hover:text-cyan-300 transition-colors underline"
      >
        Vitwit Validator 🚀
      </a>

      {/* Close button */}
      <button
        onClick={() => setVisible(false)}
        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white text-lg focus:outline-none"
        aria-label="Close banner"
      >
        ×
      </button>
    </div>
  );
};
