'use client';

import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClipboard, faCheck } from '@fortawesome/free-solid-svg-icons';

export type ShortNameProps = {
    value: string;
    maxLength: number;
    iconColor?: string;
};

export default function ShortName({ value, maxLength, iconColor = "text-gray-600" }: ShortNameProps) {
    const [copied, setCopied] = useState(false);

    const shorten = (str: string, chars = 6): string => {
        if (!str) return '';
        return `${str.slice(0, chars)}...${str.slice(-chars)}`;
    }

    const handleCopy = async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1000);
    };

    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className='text-gray-400 text-xs'>{shorten(value, maxLength)}</span>
            <button
                onClick={handleCopy}
                title="Copy"
                style={{
                    cursor: 'pointer',
                    background: 'none',
                    border: 'none',
                    padding: 0,
                }}
                className={`${iconColor}`}
                aria-label="Copy to clipboard"
            >
                <FontAwesomeIcon icon={copied ? faCheck : faClipboard} />
            </button>
        </span>
    );
}

