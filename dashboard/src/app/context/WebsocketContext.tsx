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
  retries: number;
}

const WebSocketContext = createContext<WebSocketContextType>({
  retries: 0,
});

export const useWebSocket = () => useContext(WebSocketContext);

interface Props {
  children: ReactNode;
}

export const WebSocketProvider: React.FC<Props> = ({ children }) => {
  const [nodesStats, setNodesStats] = useState<NodesStatMessage>();
  const [networkStats, setNetworkStats] = useState<NetworkMessage>();
  const [error, setError] = useState<string>();
  const [retries, setRetries] = useState<number>(0);

  const socketRef = useRef<WebSocket | null>(null);
  const retryCountRef = useRef(0);
  const maxRetries = 5;

  const connectWebSocket = () => {
    const socket = new WebSocket(`${process.env.NEXT_PUBLIC_BACKEND_WEBSOCKET}`);
    socketRef.current = socket;

    socket.onopen = () => {
      console.log('WebSocket connected');
      setError(undefined);
      setRetries(0);
      retryCountRef.current = 0;
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
        setError('Failed to parse message');
      }
    };

    socket.onerror = (err) => {
      console.error('WebSocket error:', err);
      setError('WebSocket error');
    };

    socket.onclose = () => {
      console.warn('WebSocket disconnected');

      if (retryCountRef.current < maxRetries) {
        retryCountRef.current += 1;
        setRetries(retryCountRef.current);

        const retryDelay = 1000 * retryCountRef.current; // exponential backoff: 1s, 2s, 3s...

        console.log(`Reconnecting in ${retryDelay / 1000}s... (Attempt ${retryCountRef.current})`);
        setTimeout(connectWebSocket, retryDelay);
      } else {
        console.error('Max retries reached. Could not reconnect.');
        setError('Max retries reached');
      }
    };
  };

  useEffect(() => {
    connectWebSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);

  return (
    <WebSocketContext.Provider value={{ nodesStats, networkStats, error, retries }}>
      {children}
    </WebSocketContext.Provider>
  );
};
