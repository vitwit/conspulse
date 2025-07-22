'use client';

import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClipboard, faCheck } from '@fortawesome/free-solid-svg-icons';

export type MonikerProps = {
    value: string;
    name: string;
    iconColor?: string;
    explorerUrl: string;
};

export default function Moniker({ name, value, iconColor = "text-gray-600", explorerUrl = "" }: MonikerProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1000);
    };

    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            <a
                href={`${explorerUrl}/${value}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-200 text-xs hover:underline"
                style={{ textDecorationThickness: '1px' }}
            >
                {name}
            </a>
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
