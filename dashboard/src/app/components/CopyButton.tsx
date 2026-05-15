import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClipboard, faCheck } from "@fortawesome/free-solid-svg-icons";
import type { SizeProp } from "@fortawesome/fontawesome-svg-core";

interface CopyButtonProps {
  value: string;
  size?: SizeProp;
  className?: string;
}

const CopyButton: React.FC<CopyButtonProps> = ({ value, size = "1x", className = "" }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error("Copy failed", err);
    }
  };

  return (

    <button
                onClick={handleCopy}
                title="Copy"
                style={{
                    cursor: 'pointer',
                    background: 'none',
                    border: 'none',
                    padding: 0,
                }}
                className="text-gray-600"
                aria-label="Copy to clipboard"
            >
                <FontAwesomeIcon icon={copied ? faCheck : faClipboard} />
            </button>
            
   
  );
};

export default CopyButton;
