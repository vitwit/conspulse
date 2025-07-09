'use client';

import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClipboard, faCheck } from '@fortawesome/free-solid-svg-icons';

type ShortNameProps = {
    value: string;
    maxLength: number;
};

export default function ShortName({ value, maxLength }: ShortNameProps) {
    const [copied, setCopied] = useState(false);

    // const shorten = (str: string, max: number) => {
    //     if (str.length <= max) return str;
    //     const keep = Math.floor((max - 3) / 2);
    //     return `${str.slice(0, keep)}...${str.slice(-keep)}`;
    // };

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
            <span>{shorten(value, maxLength)}</span>
            <button
                onClick={handleCopy}
                title="Copy"
                style={{
                    cursor: 'pointer',
                    background: 'none',
                    border: 'none',
                    padding: 0,
                }}
                aria-label="Copy to clipboard"
            >
                <FontAwesomeIcon icon={copied ? faCheck : faClipboard} />
            </button>
        </span>
    );
}
