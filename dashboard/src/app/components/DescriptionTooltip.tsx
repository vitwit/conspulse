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
        <span className={`text-sm text-zinc-500/90 hover:text-zinc-500 flex items-center gap-1 ${className}`}>
            {title}
            <span className="relative group">
                <Info className="w-4 h-4 text-gray-400 group-hover:text-white cursor-pointer transition-colors" />

                <div className="absolute top-full left-0 -translate-x-[20%] mt-2 z-50 rounded-md bg-black text-white text-xs px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none max-w-xs w-max break-words shadow-lg">
                    {description}
                </div>

            </span>
        </span>
    );
};

export default DescriptionTooltip;
