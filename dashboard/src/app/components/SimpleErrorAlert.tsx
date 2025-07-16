import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faTimes,
    faSyncAlt,
} from "@fortawesome/free-solid-svg-icons";

interface SimpleErrorAlertProps {
    label: string;
    message: string;
    onRetry?: () => Promise<void> | void;
}

export const SimpleErrorAlert: React.FC<SimpleErrorAlertProps> = ({
    label,
    message,
    onRetry,
}) => {
    const [visible, setVisible] = useState(true);
    const [loading, setLoading] = useState(false);

    if (!visible) return null;

    const handleRetry = async () => {
        if (!onRetry) return;
        setLoading(true);
        try {
            await onRetry();
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            role="alert"
            className="flex justify-between items-start gap-4 p-4 bg-red-900/30 border border-red-700 text-red-300 rounded-lg shadow-inner animate-fade-in"
        >
            <div className="flex-1">
                <p className="font-semibold text-red-200 mb-1">{label}</p>
                <p className="text-sm">{message}</p>
                {onRetry && (
                    <button
                        onClick={handleRetry}
                        disabled={loading}
                        className="mt-2 inline-flex items-center text-blue-400 underline hover:text-blue-300 text-sm disabled:opacity-50"
                    >
                        {loading ? (
                            <>
                                <FontAwesomeIcon icon={faSyncAlt} spin className="mr-1" />
                                Retrying...
                            </>
                        ) : (
                            <>
                                <FontAwesomeIcon icon={faSyncAlt} className="mr-1" />
                                Retry
                            </>
                        )}
                    </button>
                )}
            </div>
            <button
                onClick={() => setVisible(false)}
                className="text-red-400 hover:text-red-300"
                aria-label="Dismiss error"
            >
                <FontAwesomeIcon icon={faTimes} />
            </button>
        </div>
    );
};
