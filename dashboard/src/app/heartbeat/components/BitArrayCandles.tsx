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
    return (
        <div
            className="flex flex-row items-end gap-0.5"
            title="BitArray: green = voted, red = not voted"
        >
            {bits.split("").map((b, i) => {
                const address = validators?.[i]?.address;
                return (
                    <span
                        key={i}
                        title={address ? address : `Validator ${i}`}
                        className="cursor-pointer"
                    >
                        <div
                            className={b === "x" ? "bg-green-500" : "bg-red-400"}
                            style={{ width: 6, height: 24, borderRadius: 2 }}
                        />
                    </span>
                );
            })}
        </div>
    );
}