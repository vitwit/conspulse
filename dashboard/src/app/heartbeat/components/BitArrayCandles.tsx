import React from "react";


export function BitArrayCandles({
    bitArray,
    validators,
}: {
    bitArray: string;
    validators?: any[];
}) {
    const match = bitArray.match(/BA\{\d+:(.*?)\}/);
    const bits = match ? match[1] : null;
    if (!bits) return null;
    const votedCount = bits.split("").filter((b) => b === "x").length;
    return (
        <div title="green = voted, red = not voted">
            <div className="flex flex-row flex-wrap items-end gap-[3px]">
                {bits.split("").map((b, i) => {
                    const address = validators?.[i]?.address;
                    const voted = b === "x";
                    return (
                        <span
                            key={i}
                            title={address ? address : `Validator ${i}`}
                            className="group cursor-pointer"
                        >
                            <div
                                className={`w-[6px] h-6 rounded-[2px] transition-all duration-300 group-hover:scale-y-125 ${voted
                                    ? "bg-gradient-to-t from-emerald-600 to-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.45)]"
                                    : "bg-gradient-to-t from-rose-700 to-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.35)]"
                                    }`}
                            />
                        </span>
                    );
                })}
            </div>
            <div className="mt-2 text-xs font-mono text-slate-500">
                {votedCount}/{bits.length} validators voted
            </div>
        </div>
    );
}
