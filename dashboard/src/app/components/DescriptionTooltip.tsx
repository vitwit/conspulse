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
            className={`text-sm font-semibold text-white/90 flex items-center gap-1 ${className}`}
        >
            {title}
            <span className="relative group">
                <Info className="w-4 h-4 text-gray-400 group-hover:text-white cursor-pointer transition-colors" />

                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 rounded-md bg-black text-white text-xs px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none max-w-sm min-w-[150px] w-max whitespace-normal break-normal shadow-lg">
                    {description}
                </div>

            </span>
        </span>
    );
};

export default DescriptionTooltip;
