import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTimes,
  faSyncAlt,
} from "@fortawesome/free-solid-svg-icons";

export function ErrorAlert({
  errors,
}: {
  errors: {
    label: string;
    message: string | null;
    onRetry?: () => Promise<void> | void;
  }[];
}) {
  const [dismissed, setDismissed] = useState<boolean[]>(errors.map(() => false));
  const [loading, setLoading] = useState<boolean[]>(errors.map(() => false));

  const handleDismiss = (index: number) => {
    setDismissed((prev) => {
      const updated = [...prev];
      updated[index] = true;
      return updated;
    });
  };

  const handleRetry = async (index: number, retryFn: () => Promise<void> | void) => {
    setLoading((prev) => {
      const updated = [...prev];
      updated[index] = true;
      return updated;
    });

    try {
      await retryFn();
    } finally {
      setLoading((prev) => {
        const updated = [...prev];
        updated[index] = false;
        return updated;
      });
    }
  };

  const visibleErrors = errors
    .map((e, i) => ({ ...e, index: i }))
    .filter((e) => e.message && !dismissed[e.index]);

  if (visibleErrors.length === 0) return null;

  return (
    <div
      role="alert"
      className="mb-6 p-4 bg-red-900/30 border border-red-700 text-red-300 rounded-lg shadow-inner animate-fade-in"
    >
      <div className="flex justify-between items-center mb-2">
        <p className="font-semibold text-red-200">
          Errors occurred while fetching data:
        </p>
        <button
          className="text-red-400 hover:text-red-300 text-sm"
          onClick={() => setDismissed(errors.map(() => true))}
          aria-label="Dismiss all errors"
        >
          Dismiss All
        </button>
      </div>

      <ul className="list-disc list-inside text-sm space-y-1">
        {visibleErrors.map((e) => (
          <li key={e.index} className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <span className="font-medium text-red-200">{e.label}</span>: {e.message}
              {e.onRetry && (
                <button
                  onClick={() => handleRetry(e.index, e.onRetry!)}
                  disabled={loading[e.index]}
                  className="ml-2 text-blue-400 underline hover:text-blue-300 transition disabled:opacity-50"
                >
                  {loading[e.index] ? (
                    <span className="inline-flex items-center gap-1">
                      <FontAwesomeIcon icon={faSyncAlt} spin /> Retrying...
                    </span>
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
              onClick={() => handleDismiss(e.index)}
              className="text-red-400 hover:text-red-300 text-xs"
              aria-label={`Dismiss ${e.label} error`}
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
