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
        <span className={`section-title flex items-center gap-1.5 ${className || ''}`}>
            {title}
            <span className="relative group normal-case tracking-normal">
                <Info className="w-3.5 h-3.5 text-slate-600 group-hover:text-cyan-400 cursor-pointer transition-colors" />

                <div className="absolute top-full left-0 -translate-x-[20%] mt-2 z-50 rounded-lg border border-[var(--edge-strong)] bg-[#0c1220] text-slate-200 text-xs font-normal px-3 py-2 opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 pointer-events-none max-w-xs w-max break-words shadow-[0_12px_32px_rgba(0,0,0,0.5)]">
                    {description}
                </div>
            </span>
        </span>
    );
};

export default DescriptionTooltip;
