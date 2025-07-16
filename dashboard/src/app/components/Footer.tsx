import React from "react";
import {
  faTwitter,
  faTelegram,
  faGithub,
} from "@fortawesome/free-brands-svg-icons";
import { faEnvelope } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

const NETWORK_NAME = process.env.NEXT_PUBLIC_NETWORK_NAME || "the network";

export default function Footer() {
  return (
    <footer className="w-full bg-[#13161c] border-t border-[#1f232b] px-4 pt-10 pb-6 text-sm text-gray-400">
      <div className="max-w-6xl mx-auto w-full flex flex-col sm:flex-row justify-between gap-10">
        {/* Left: About */}
        <div className="flex-1 min-w-[240px]">
          <div className="flex items-center mb-3">
            <img src="/conspulse-logo.svg" alt="Conspulse Logo" className="h-8 w-8 mr-2" />
            <span className="font-semibold text-lg text-white">Conspulse</span>
          </div>
          <h3 className="font-semibold text-base text-gray-300 mb-1">About Conspulse</h3>
          <p className="text-gray-400 leading-relaxed text-sm">
            <span className="font-bold text-white">Conspulse</span> is a Tendermint validator dashboard for{" "}
            <span className="font-semibold text-cyan-400">{NETWORK_NAME}</span>. It provides real-time consensus state,
            validator stats, and network insights to help monitor performance and health. Support us by delegating to the{" "}
            <span className="text-cyan-400 font-semibold">Vitwit Validator</span>.
          </p>
        </div>

        {/* Right: Socials and Attribution */}
        <div className="flex-1 flex flex-col items-start sm:items-end gap-3">
          <div className="flex gap-5">
            <a
              href="mailto:hello@vitwit.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Email"
              className="hover:text-cyan-400 transition-transform hover:scale-110"
            >
              <FontAwesomeIcon icon={faEnvelope} size="lg" />
            </a>
            <a
              href="https://t.me/vitwit"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Telegram"
              className="hover:text-blue-400 transition-transform hover:scale-110"
            >
              <FontAwesomeIcon icon={faTelegram} size="lg" />
            </a>
            <a
              href="https://twitter.com/vitwit"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Twitter"
              className="hover:text-blue-500 transition-transform hover:scale-110"
            >
              <FontAwesomeIcon icon={faTwitter} size="lg" />
            </a>
            <a
              href="https://github.com/vitwit"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub"
              className="hover:text-gray-100 transition-transform hover:scale-110"
            >
              <FontAwesomeIcon icon={faGithub} size="lg" />
            </a>
          </div>

          <div className="flex items-center gap-2 mt-3">
            <span>Powered by</span>
            <a
              href="https://vitwit.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-cyan-400 hover:underline"
            >
              Vitwit
            </a>
          </div>

          <div className="flex items-center gap-2 mt-1">
            <span>Supported by</span>
            <a
              href="https://polygon.technology"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-purple-400 hover:underline flex items-center gap-1"
            >
              Polygon
              <img src="/polygon-logo.svg" alt="Polygon Logo" className="h-4 w-4 inline" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
