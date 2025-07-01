import http, { IncomingMessage } from 'http';
import { WebSocketServer, WebSocket } from 'ws';

import logger from './logger';
import { banned } from './utils/config';
import { isNull, isUndefined, values } from 'lodash';
import Collection from './collection';

interface ExtendedWebSocket extends WebSocket {
    pathname?: string;
}

// Init WS SECRET
var WS_SECRET: string[] = [];

console.log('process.env.WS_SECRET:', process.env.WS_SECRET);


if (!isUndefined(process.env.WS_SECRET) && !isNull(process.env.WS_SECRET)) {
    if (process.env.WS_SECRET.indexOf('|') > 0) {
        WS_SECRET = process.env.WS_SECRET.split('|');
    }
    else {
        WS_SECRET = [process.env.WS_SECRET];
    }
    console.log(WS_SECRET)
}
else {
    try {
        var tmp_secret_json = require('./ws_secret.json');
        WS_SECRET = values(tmp_secret_json);
    }
    catch (e) {
        console.error("WS_SECRET NOT SET!!!");
    }
    console.log(WS_SECRET)
}


const apiClients = new Set<WebSocket>();
const dashboardClients = new Set<WebSocket>();
const externalClients = new Set<WebSocket>();


// Create native HTTP server
const server = http.createServer();

// WebSocket server without binding to a specific port
const wss = new WebSocketServer({ noServer: true });

// Handle WebSocket upgrade requests
server.on('upgrade', (req, socket, head) => {
    const { pathname } = new URL(req.url!, `http://${req.headers.host}`);

    if (['/api', '/primus', '/external'].includes(pathname)) {
        wss.handleUpgrade(req, socket, head, (ws) => {
            (ws as any).pathname = pathname;
            wss.emit('connection', ws, req);
        });
    } else {
        socket.destroy();
    }
});

// Handle incoming WebSocket connections
wss.on('connection', (ws: ExtendedWebSocket, req: IncomingMessage) => {

    const ip = req.socket.remoteAddress || '';
    const path = ws.pathname;

    switch (path) {
        case '/api':
            apiClients.add(ws);
            setupApiClient(ws, ip);
            break;
        case '/primus':
            dashboardClients.add(ws);
            setupDashboardClient(ws);
            break;
        case '/external':
            externalClients.add(ws);
            setupExternalClient(ws);
            break;
    }

    ws.on('close', () => {
        apiClients.delete(ws);
        dashboardClients.delete(ws);
        externalClients.delete(ws);
    });

    ws.on('message', (message: string) => {
        try {
            const msg = JSON.parse(message.toString());

            if (Array.isArray(msg.emit)) {
                const [event, payload] = msg.emit;
                handleApiEvent(ws, event, payload, ip);
            }
        } catch (e) {
            console.error('Invalid JSON:', e);
        }
    });

    ws.on('close', () => {
        logger.info('Client disconnected from /api');
    });
});

var Nodes = new Collection(externalClients);


function setupApiClient(ws: WebSocket, ip: string) {
    ws.on('message', (message) => {
        try {
            const msg = JSON.parse(message.toString());

            if (Array.isArray(msg.emit)) {
                const [event, payload] = msg.emit;
                handleApiEvent(ws, event, payload, ip);
            }
        } catch (e) {
            console.error('Invalid JSON:', e);
        }
    });
}


function setupDashboardClient(ws: WebSocket) {
    // Listen if needed (dashboard -> server)
    ws.on('message', (message) => {
        // For now, just log
        console.log('Dashboard message:', message.toString());
    });
}

function setupExternalClient(ws: WebSocket) {
    // Listen if needed (external nodes -> server)
    ws.on('message', (message) => {
        console.log('External message:', message.toString());
    });
}



function handleApiEvent(ws: WebSocket, eventName: string, payload: any, ip: string) {
    switch (eventName) {
        case 'hello': {

            logger.info({ id: payload.id, ip }, 'Received hello message');

            console.log('hello message', payload);

            if (
                !payload.secret ||
                WS_SECRET.indexOf(payload.secret) === -1 ||
                banned.includes(ip)
            ) {
                ws.close(1008, 'Unauthorized');
                logger.warn(
                    { id: payload.id, ip, secret: payload.secret },
                    'Unauthorized hello attempt'
                );
                return;
            }

            if (payload.id && payload.info) {
                logger.info({ id: payload.id, ip }, 'Client authenticated and connected');

                Nodes.add(payload, function (err, info) {
                    if (err !== null) {
                        console.error('API', 'CON', 'Connection error:', err);
                        return false;
                    }

                    if (info !== null) {
                        ws.send(JSON.stringify({ emit: ['ready'] }));

                        logger.info('API', 'CON', 'Connected', payload.id);

                        ws.send(JSON.stringify({
                            action: 'add',
                            data: info
                        }));
                    }
                });

                // Send ready message back
                ws.send(JSON.stringify({ type: 'ready' }));
            }
            break;
        }

        case 'block':
            if (!isUndefined(payload.id) && !isUndefined(payload.block)) {
                Nodes.addBlock(payload.id, payload.block, (err: string | null, stats: any) => {
                    if (err !== null) {
                        logger.error('API', 'BLK', 'Block error:', err);
                        return;
                    }

                    if (stats !== null) {
                        ws.send(JSON.stringify({
                            action: 'block',
                            data: stats
                        }));

                        logger.info(`API BLK Block: ${payload.block.number} from: ${payload.id}`);

                        // Nodes.getCharts();
                    }
                });
            } else {
                logger.error('API', 'BLK', 'Block error: Missing id or block', payload);
            }
            break;

        case 'stats':
            if (!isUndefined(payload.id) && !isUndefined(payload.stats)) {
                Nodes.updateStats(payload.id, payload.stats, (err: any, stats: any) => {
                    if (err !== null) {
                        logger.error({ id: payload.id, err }, 'Stats error');
                    } else if (stats !== null) {
                        // Send stats to external dashboard (Primus replacement)
                        if (ws && ws.readyState === WebSocket.OPEN) {
                            ws.send(JSON.stringify({
                                action: 'stats',
                                data: stats
                            }));
                        }

                        logger.info({ id: payload.id }, 'Stats received');
                    }
                });
            } else {
                logger.error({ payload }, 'Invalid stats payload');
            }
            break;

        case 'end': {
            Nodes.inactive(payload.id, (err: any, stats: any) => {
                if (err !== null) {
                    console.error('API', 'CON', 'Connection end error:', err);
                }
                else {
                    ws.send(JSON.stringify({
                        action: 'inactive',
                        data: stats
                    }));

                    logger.warn('API', 'CON', 'Connection with:', payload.id, 'ended:');
                }
            })
        }

        default:
            logger.warn({ eventName }, 'Unknown event received');
            console.log(`Unknown event "${eventName}":`, payload);
    }
}



server.listen(8080, () => {
    logger.info('🚀 WebSocket server running on ws://localhost:8080/api');
});