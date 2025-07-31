import React from 'react';

interface Props {
    latency: number;
    formatted: string;
}

const LatencyCell: React.FC<Props> = ({ latency, formatted }) => {
    const colorClass =
        latency > 100
            ? 'text-red-300'
            : latency > 50
            ? 'text-yellow-300'
            : 'text-gray-400';

    return (
        <span
            className={`font-mono ${colorClass}`}
            title={
                latency > 100
                    ? 'High latency'
                    : latency > 50
                    ? 'Moderate latency'
                    : 'Latency OK'
            }
        >
            {formatted}
        </span>
    );
};

export default LatencyCell;
