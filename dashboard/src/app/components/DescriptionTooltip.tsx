'use client';

import React from 'react';
import { Info } from 'lucide-react';

type Props = {
  title: string;
  description: string;
  className?: string;
};

const DescriptionTooltip: React.FC<Props> = ({ title, description, className }) => {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider ${className ?? ''}`}
      style={{ color: "var(--text-secondary)" }}
    >
      {title}
      <span className="relative group">
        <Info
          className="w-3.5 h-3.5 cursor-help transition-colors"
          style={{ color: "var(--text-muted)" }}
        />

        {/* Tooltip bubble — appears above by default, flips if needed via CSS */}
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 z-50
                     rounded-lg text-xs px-3 py-2 w-max max-w-[220px] break-words
                     shadow-xl opacity-0 pointer-events-none
                     group-hover:opacity-100 transition-opacity duration-200
                     whitespace-normal leading-relaxed"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-default)",
            color: "var(--text-primary)",
          }}
        >
          {description}
          {/* Arrow */}
          <span
            className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0"
            style={{
              borderLeft: "5px solid transparent",
              borderRight: "5px solid transparent",
              borderTop: "5px solid var(--bg-elevated)",
            }}
          />
        </div>
      </span>
    </span>
  );
};

export default DescriptionTooltip;
