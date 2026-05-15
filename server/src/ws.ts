import { WebSocketServer, WebSocket } from 'ws';
import logger from './logger/logger';

const MAX_CLIENTS = 5_000;
export const clients = new Set<WebSocket>();

let wss: WebSocketServer;

export function setupWebSocket(server: import('http').Server) {
    wss = new WebSocketServer({ server });

    wss.on('connection', (ws: WebSocket) => {
        if (clients.size >= MAX_CLIENTS) {
            ws.send(JSON.stringify({ error: 'Server full. Try again later.' }));
            ws.close();
            return;
        }

        clients.add(ws);
        logger.info(`[WebSocket] client connected. Total: ${clients.size}`);

        ws.on('close', () => {
            clients.delete(ws);
            logger.info(`[Websocket] client disconnected. Total: ${clients.size}`);
        });

        ws.on('error', (err) => {
            logger.error(`WebSocket error:`, err);
            clients.delete(ws);
        });
    });
}
