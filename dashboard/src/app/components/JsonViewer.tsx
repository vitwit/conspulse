"use client";

import React, { useState } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';

interface JsonViewerProps {
  data: any;
  initialExpanded?: boolean;
  level?: number;
}

export default function JsonViewer({ data, initialExpanded = false, level = 0 }: JsonViewerProps) {
  const [isExpanded, setIsExpanded] = useState(initialExpanded || level < 2);

  if (data === null) return <span className="text-gray-500">null</span>;
  if (typeof data === 'undefined') return <span className="text-gray-500">undefined</span>;

  if (Array.isArray(data)) {
    if (data.length === 0) return <span className="text-gray-500">[]</span>;

    return (
      <div className="font-mono text-xs">
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors"
        >
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <span>Array[{data.length}]</span>
        </button>
        {isExpanded && (
          <div className="ml-4 border-l border-gray-800 pl-4 my-1 flex flex-col gap-1">
            {data.map((item, idx) => (
              <div key={idx} className="flex gap-2">
                <span className="text-gray-600">[{idx}]:</span>
                <JsonViewer data={item} level={level + 1} />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (typeof data === 'object') {
    const keys = Object.keys(data);
    if (keys.length === 0) return <span className="text-gray-500">{"{}"}</span>;

    return (
      <div className="font-mono text-xs">
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 text-purple-400 hover:text-purple-300 transition-colors"
        >
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <span>Object</span>
        </button>
        {isExpanded && (
          <div className="ml-4 border-l border-gray-800 pl-4 my-1 flex flex-col gap-1">
            {keys.map(key => (
              <div key={key} className="flex gap-2">
                <span className="text-gray-400 font-medium">{key}:</span>
                <JsonViewer data={data[key]} level={level + 1} />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (typeof data === 'string') {
    if (data.startsWith('0x')) return <span className="text-orange-400 font-mono break-all group relative cursor-help">"{data}"</span>;
    return <span className="text-green-400">"{data}"</span>;
  }

  if (typeof data === 'number') return <span className="text-yellow-400">{data}</span>;
  if (typeof data === 'boolean') return <span className={data ? "text-green-500" : "text-red-500"}>{data.toString()}</span>;

  return <span className="text-gray-300">{String(data)}</span>;
}
