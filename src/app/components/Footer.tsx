import React from "react";

export default function Footer() {
  return (
    <footer className="w-full bg-gradient-to-r from-gray-50 to-blue-50 border-t mt-8 px-4 pt-8 pb-4 flex flex-col gap-4 text-gray-700 text-sm shadow-inner">
      <div className="max-w-5xl mx-auto w-full flex flex-col sm:flex-row justify-between items-start gap-8">
        {/* About Section Left */}
        <div className="flex-1 min-w-[220px] mb-4 sm:mb-0">
          <div className="flex items-center mb-2">
            <img src="/conspulse-logo.svg" alt="Conspulse Logo" className="h-10 w-10 mr-2" />
            <span className="font-bold text-lg text-blue-700 self-center">Conspulse</span>
          </div>
          <h3 className="font-semibold text-base text-blue-800 mb-1">About Conspulse</h3>
          <p className="text-gray-700 leading-relaxed">
            <span className="font-bold">Conspulse</span> is a Tendermint validator dashboard for <span className="font-semibold text-blue-700">the network</span>. It provides real-time consensus state, validator stats, and network insights, helping users and operators monitor validator performance and network health. Support us by delegating to the Vitwit validator!
          </p>
        </div>
        {/* Socials & Powered by Right */}
        <div className="flex-1 flex flex-col items-start sm:items-end gap-3">
          <div className="flex gap-5 mb-2">
            <a href="mailto:hello@vitwit.com" target="_blank" rel="noopener noreferrer" aria-label="Email" title="Email" className="hover:text-blue-600 transition-transform hover:scale-110">
              <svg width="26" height="26" fill="currentColor" viewBox="0 0 24 24"><path d="M1.5 4.75A2.25 2.25 0 0 1 3.75 2.5h16.5A2.25 2.25 0 0 1 22.5 4.75v14.5A2.25 2.25 0 0 1 20.25 21.5H3.75A2.25 2.25 0 0 1 1.5 19.25V4.75Zm2.25-.75a.75.75 0 0 0-.75.75v.637l8.25 6.188 8.25-6.188V4.75a.75.75 0 0 0-.75-.75H3.75Zm16.5 2.863-7.728 5.797a.75.75 0 0 1-.894 0L3.75 6.863V19.25a.75.75 0 0 0 .75.75h16.5a.75.75 0 0 0 .75-.75V6.863ZM3.75 4.75v.011V4.75Z"/></svg>
            </a>
            <a href="https://t.me/vitwit" target="_blank" rel="noopener noreferrer" aria-label="Telegram" title="Telegram" className="hover:text-blue-400 transition-transform hover:scale-110">
              <svg width="26" height="26" fill="currentColor" viewBox="0 0 24 24"><path d="M9.036 16.927c-.38 0-.313-.144-.444-.504l-1.11-3.662 8.52-5.04c.39-.222.6-.099.486.312l-1.452 6.6c-.108.444-.36.552-.732.342l-2.028-1.494-.978.942c-.108.108-.204.204-.42.204zm-2.232-1.98l.3 1.008c.06.192.12.264.252.264.06 0 .132-.024.216-.072l1.38-.888 2.1 1.548c.252.18.468.084.54-.216l1.452-6.6c.06-.252-.06-.36-.288-.24l-7.8 4.62c-.24.144-.24.348.048.432l1.98.576zm15.192-10.947c-1.2-1.2-3.144-1.2-4.344 0l-13.2 13.2c-1.2 1.2-1.2 3.144 0 4.344 1.2 1.2 3.144 1.2 4.344 0l13.2-13.2c1.2-1.2 1.2-3.144 0-4.344z"/></svg>
            </a>
            <a href="https://twitter.com/vitwit" target="_blank" rel="noopener noreferrer" aria-label="Twitter" title="Twitter" className="hover:text-blue-500 transition-transform hover:scale-110">
              <svg width="26" height="26" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557a9.93 9.93 0 0 1-2.828.775 4.932 4.932 0 0 0 2.165-2.724c-.951.564-2.005.974-3.127 1.195A4.92 4.92 0 0 0 16.616 3c-2.73 0-4.942 2.21-4.942 4.936 0 .39.045.765.127 1.124C7.728 8.89 4.1 6.89 1.671 3.905c-.427.722-.666 1.561-.666 2.475 0 1.708.87 3.216 2.188 4.099a4.904 4.904 0 0 1-2.237-.616c-.054 2.281 1.581 4.415 3.949 4.89-.386.104-.793.16-1.213.16-.297 0-.583-.028-.862-.08.584 1.823 2.28 3.15 4.29 3.187A9.867 9.867 0 0 1 0 21.543a13.94 13.94 0 0 0 7.548 2.209c9.057 0 14.009-7.496 14.009-13.986 0-.213-.005-.425-.014-.636A9.936 9.936 0 0 0 24 4.557z"/></svg>
            </a>
            <a href="https://github.com/vitwit" target="_blank" rel="noopener noreferrer" aria-label="GitHub" title="GitHub" className="hover:text-gray-900 transition-transform hover:scale-110">
              <svg width="26" height="26" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.373 0 12c0 5.303 3.438 9.8 8.205 11.387.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.726-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.09-.745.083-.729.083-.729 1.205.084 1.84 1.237 1.84 1.237 1.07 1.834 2.807 1.304 3.492.997.108-.775.418-1.305.762-1.605-2.665-.304-5.466-1.334-5.466-5.931 0-1.31.468-2.381 1.236-3.221-.124-.303-.535-1.523.117-3.176 0 0 1.008-.322 3.3 1.23a11.52 11.52 0 0 1 3.003-.404c1.018.005 2.045.138 3.003.404 2.291-1.553 3.297-1.23 3.297-1.23.653 1.653.242 2.873.119 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.803 5.625-5.475 5.921.43.371.823 1.102.823 2.222 0 1.606-.015 2.898-.015 3.293 0 .321.218.694.825.576C20.565 21.796 24 17.299 24 12c0-6.627-5.373-12-12-12z"/></svg>
            </a>
          </div>
          <div className="flex items-center gap-2 mt-2 text-gray-500">
            <span>Powered by</span>
            <a href="https://vitwit.com" target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-700 hover:underline">Vitwit</a>
          </div>
          <div className="flex items-center gap-2 mt-1 text-gray-500">
            <span>Supported by</span>
            <a href="https://polygon.technology" target="_blank" rel="noopener noreferrer" className="font-semibold text-purple-700 hover:underline flex items-center gap-1">
              Polygon
              <img src="/polygon-logo.svg" alt="Polygon Logo" className="h-5 w-5 inline" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
} 