import React from 'react';

interface Props {
    latency: number;
    formatted: string;
}

const LatencyCell: React.FC<Props> = ({ latency, formatted }) => {
    const isHigh = latency > 100;

    return (
        <span
            className={`font-mono ${isHigh ? 'bg-red-900/40 text-red-300 px-2 py-1 rounded' : ''}`}
            title={isHigh ? 'High latency' : 'Latency OK'}
        >
            {formatted}
        </span>
    );
};

export default LatencyCell;
