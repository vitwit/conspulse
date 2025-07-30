'use client';
import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClipboard, faCheck, faExternalLink } from '@fortawesome/free-solid-svg-icons';

interface Props {
    moniker: string;
    nodeId: string;
    address: string;
    explorerUrl: string;
}

const NodeIdentityCell: React.FC<Props> = ({ moniker, nodeId, address, explorerUrl }) => {
    const shortNodeId = `${nodeId.slice(0, 6)}...`;
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(nodeId);
        setCopied(true);
        setTimeout(() => setCopied(false), 1000);
    };

    return (
        <div className="flex items-start gap-3">
            {/* Avatar */}
            <div className="h-8 w-8 flex items-center justify-center rounded-full bg-green-600 text-white font-bold uppercase">
                {moniker?.charAt(0) || '?'}
            </div>

            {/* Moniker + NodeID */}
            <div className="flex flex-col">
                {/* Moniker with explorer link */}
                <div className="flex items-center gap-1">
                    <a
                        href={`${explorerUrl}/validators/${address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline text-green-400 font-medium"
                        title="View in explorer"
                    >
                        {moniker}
                    </a>
                    <FontAwesomeIcon
                        icon={faExternalLink}
                        className="text-green-400 opacity-70 cursor-pointer hover:opacity-100"
                        title="Open in explorer"
                        onClick={() => window.open(`${explorerUrl}/validators/0x${address}`, '_blank')}
                    />
                </div>

                <div className="flex items-center gap-1 text-xs text-zinc-400 font-mono mt-1">
                    <span>{shortNodeId}</span>
                    <FontAwesomeIcon
                        icon={copied ? faCheck : faClipboard}
                        className={`cursor-pointer transition-colors duration-300 ${
                            copied
                                ? 'text-green-500 hover:text-green-600'
                                : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                        onClick={handleCopy}
                        title={copied ? 'Copied!' : 'Copy Node ID'}
                    />
                </div>
            </div>
        </div>
    );
};

export default NodeIdentityCell;
