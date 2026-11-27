'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useRef,
} from 'react';
import {
  WebSocketMessage,
  NodesStatMessage,
  NetworkMessage,
} from './../types/ws';

interface WebSocketContextType {
  nodesStats?: NodesStatMessage;
  networkStats?: NetworkMessage;
  error?: string;
  connected: boolean;
}

const WebSocketContext = createContext<WebSocketContextType>({
  connected: false,
});

export const useWebSocket = () => useContext(WebSocketContext);

interface Props {
  children: ReactNode;
}

// Reconnect indefinitely with capped exponential backoff so a longer outage
// (server redeploy, laptop sleep, network blip) never permanently kills the
// live feed.
const MAX_RECONNECT_DELAY = 30_000;

export const WebSocketProvider: React.FC<Props> = ({ children }) => {
  const [nodesStats, setNodesStats] = useState<NodesStatMessage>();
  const [networkStats, setNetworkStats] = useState<NetworkMessage>();
  const [error, setError] = useState<string>();
  const [connected, setConnected] = useState<boolean>(false);

  const socketRef = useRef<WebSocket | null>(null);
  const retryCountRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmountingRef = useRef(false);
  // Guards the error notification to once per outage episode, so the toast is
  // not spammed on every reconnect attempt.
  const notifiedRef = useRef(false);

  const connectWebSocket = () => {
    const url = process.env.NEXT_PUBLIC_BACKEND_WEBSOCKET;
    if (!url) {
      setError('Live server URL is not configured.');
      return;
    }

    const socket = new WebSocket(url);
    socketRef.current = socket;

    socket.onopen = () => {
      console.log('WebSocket connected');
      setConnected(true);
      setError(undefined);
      retryCountRef.current = 0;
      notifiedRef.current = false;
    };

    socket.onmessage = (event) => {
      try {
        const data: WebSocketMessage = JSON.parse(event.data);
        if (data.type === 'node_stats') {
          setNodesStats(data as NodesStatMessage);
        } else if (data.type === 'network_stats') {
          setNetworkStats(data as NetworkMessage);
        }
      } catch (err) {
        console.error('Failed to parse WebSocket message', err);
      }
    };

    socket.onerror = (err) => {
      console.error('WebSocket error:', err);
      // onclose fires after onerror and handles the reconnect/notification.
      socket.close();
    };

    socket.onclose = () => {
      if (unmountingRef.current) return;
      console.warn('WebSocket disconnected');
      setConnected(false);

      if (!notifiedRef.current) {
        setError('Live connection lost. Reconnecting…');
        notifiedRef.current = true;
      }

      const delay = Math.min(
        MAX_RECONNECT_DELAY,
        1000 * 2 ** retryCountRef.current
      );
      retryCountRef.current += 1;
      reconnectTimerRef.current = setTimeout(connectWebSocket, delay);
    };
  };

  useEffect(() => {
    unmountingRef.current = false;
    connectWebSocket();

    return () => {
      unmountingRef.current = true;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      socketRef.current?.close();
    };
  }, []);

  return (
    <WebSocketContext.Provider value={{ nodesStats, networkStats, error, connected }}>
      {children}
    </WebSocketContext.Provider>
  );
};
