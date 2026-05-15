"use client";

import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Copy, Check } from 'lucide-react';

interface JsonViewerProps {
  data: any;
  initialExpanded?: boolean | null;
  level?: number;
  name?: string | null;
  isLast?: boolean;
}

export default function JsonViewer({ data, initialExpanded = null, level = 0, name = null, isLast = true }: JsonViewerProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  // Root-level wrapper with copy button
  if (level === 0) {
    return (
      <div className="relative">
        <button
          onClick={handleCopy}
          className="absolute top-0 right-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium bg-[#2a2f3a] hover:bg-[#343a47] text-gray-400 hover:text-white transition-all z-10"
          title="Copy JSON"
        >
          {copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
          {copied ? "Copied!" : "Copy"}
        </button>
        <JsonNode data={data} initialExpanded={initialExpanded} level={0} name={name} isLast={isLast} />
      </div>
    );
  }

  return <JsonNode data={data} initialExpanded={initialExpanded} level={level} name={name} isLast={isLast} />;
}

function JsonNode({ data, initialExpanded = null, level = 0, name = null, isLast = true }: JsonViewerProps) {
  const shouldExpand = initialExpanded !== null ? initialExpanded : level < 3;
  const [isExpanded, setIsExpanded] = useState(shouldExpand);

  if (data === null) {
    return (
      <div className="font-mono text-[13px] flex items-start">
        <div className="w-[18px] flex-shrink-0"></div>
        <NodeName name={name} />
        <div><span className="text-gray-500 font-bold">null</span>{!isLast && <span className="text-gray-500">,</span>}</div>
      </div>
    );
  }
  
  if (typeof data === 'undefined') {
    return (
      <div className="font-mono text-[13px] flex items-start">
        <div className="w-[18px] flex-shrink-0"></div>
        <NodeName name={name} />
        <div><span className="text-gray-500 font-bold">undefined</span>{!isLast && <span className="text-gray-500">,</span>}</div>
      </div>
    );
  }

  if (Array.isArray(data)) {
    if (data.length === 0) {
      return (
        <div className="font-mono text-[13px] flex items-start">
          <div className="w-[18px] flex-shrink-0"></div>
          <NodeName name={name} />
          <div><span className="text-gray-500">[]</span>{!isLast && <span className="text-gray-500">,</span>}</div>
        </div>
      );
    }

    return (
      <div className="font-mono text-[13px] leading-relaxed flex flex-col">
        <div className="flex items-center">
          <button onClick={() => setIsExpanded(!isExpanded)} className="text-gray-400 hover:text-white mr-1 outline-none w-[14px]">
             {isExpanded ? <ChevronDown size={14}/> : <ChevronRight size={14}/> }
          </button>
          <NodeName name={name} />
          <span className="text-gray-400">[</span>
          {!isExpanded && <span className="text-gray-500 italic ml-2 cursor-pointer hover:text-gray-300" onClick={() => setIsExpanded(true)}>{data.length} items ]{!isLast && <span className="text-gray-500">,</span>}</span>}
        </div>
        {isExpanded && (
          <div className="pl-4 border-l border-[#30363d] ml-[7px] mt-0.5 mb-0.5">
            {data.map((item, idx) => (
              <JsonNode key={idx} data={item} level={level + 1} isLast={idx === data.length - 1} initialExpanded={initialExpanded} />
            ))}
          </div>
        )}
        {isExpanded && (
          <div className="flex">
            <div className="w-[18px] flex-shrink-0"></div>
            <div><span className="text-gray-400">]</span>{!isLast && <span className="text-gray-500">,</span>}</div>
          </div>
        )}
      </div>
    );
  }

  if (typeof data === 'object') {
    const keys = Object.keys(data);
    if (keys.length === 0) {
      return (
        <div className="font-mono text-[13px] flex items-start">
          <div className="w-[18px] flex-shrink-0"></div>
          <NodeName name={name} />
          <div><span className="text-gray-500">{"{}"}</span>{!isLast && <span className="text-gray-500">,</span>}</div>
        </div>
      );
    }

    return (
      <div className="font-mono text-[13px] leading-relaxed flex flex-col">
        <div className="flex items-center">
          <button onClick={() => setIsExpanded(!isExpanded)} className="text-gray-400 hover:text-white mr-1 outline-none w-[14px]">
             {isExpanded ? <ChevronDown size={14}/> : <ChevronRight size={14}/> }
          </button>
          <NodeName name={name} />
          <span className="text-gray-400">{"{"}</span>
          {!isExpanded && <span className="text-gray-500 italic ml-2 cursor-pointer hover:text-gray-300" onClick={() => setIsExpanded(true)}>{keys.length} keys {"}"}{!isLast && <span className="text-gray-500">,</span>}</span>}
        </div>
        {isExpanded && (
          <div className="pl-4 border-l border-[#30363d] ml-[7px] mt-0.5 mb-0.5">
            {keys.map((key, idx) => (
              <JsonNode key={key} name={key} data={data[key]} level={level + 1} isLast={idx === keys.length - 1} initialExpanded={initialExpanded} />
            ))}
          </div>
        )}
        {isExpanded && (
          <div className="flex">
            <div className="w-[18px] flex-shrink-0"></div>
            <div><span className="text-gray-400">{"}"}</span>{!isLast && <span className="text-gray-500">,</span>}</div>
          </div>
        )}
      </div>
    );
  }

  // Primitives
  let valueSpan;
  if (typeof data === 'string') {
    valueSpan = <span className="text-[#a5d6ff] break-all">"{data}"</span>;
  } else if (typeof data === 'number') {
    valueSpan = <span className="text-[#79c0ff]">{data}</span>;
  } else if (typeof data === 'boolean') {
    valueSpan = <span className="text-[#ff7b72]">{data.toString()}</span>;
  } else {
    valueSpan = <span className="text-gray-300">{String(data)}</span>;
  }

  return (
    <div className="font-mono text-[13px] leading-relaxed flex flex-wrap items-start pt-[1px]">
      <div className="w-[18px] flex-shrink-0"></div>
      <NodeName name={name} />
      <div className="flex-1 min-w-[200px]">
        {valueSpan}
        {!isLast && <span className="text-gray-500">,</span>}
      </div>
    </div>
  );
}

function NodeName({ name }: { name?: string | null }) {
  if (!name) return null;
  return <span className="text-[#7ee787] mr-1 flex-shrink-0">"{name}": </span>;
}
