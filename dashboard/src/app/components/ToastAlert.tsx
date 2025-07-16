import React, { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCircleInfo,
  faTimes,
  faTriangleExclamation,
} from "@fortawesome/free-solid-svg-icons";

type ToastType = "info" | "error";

interface ToastAlertProps {
  type: ToastType;
  message: string;
  duration?: number; // ms
}

export const ToastAlert: React.FC<ToastAlertProps> = ({
  type,
  message,
  duration = 5000,
}) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), duration);
    return () => clearTimeout(timer);
  }, [duration]);

  if (!visible) return null;

  const baseStyle =
    "flex items-start gap-3 px-4 py-3 rounded-md shadow-lg text-sm animate-slide-in max-w-sm w-full";

  const typeStyles = {
    info:
      "bg-blue-100 text-blue-900 border border-blue-300 " +
      "dark:bg-blue-800/20 dark:text-blue-200 dark:border-blue-600",
    error:
      "bg-red-100 text-red-900 border border-red-300 " +
      "dark:bg-red-800/20 dark:text-red-200 dark:border-red-600",
  };

  const icon = type === "info" ? faCircleInfo : faTriangleExclamation;

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className={`${baseStyle} ${typeStyles[type]}`}>
        <FontAwesomeIcon icon={icon} className="mt-1.5 flex-shrink-0" />
        <div className="flex-1">{message}</div>
        <button
          onClick={() => setVisible(false)}
          className="text-inherit hover:opacity-70 transition"
          aria-label="Dismiss notification"
        >
          <FontAwesomeIcon icon={faTimes} />
        </button>
      </div>
    </div>
  );
};
