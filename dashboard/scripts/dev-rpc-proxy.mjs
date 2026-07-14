#!/usr/bin/env node
/**
 * Dev-only proxy for testing the dashboard locally against a production
 * Tendermint RPC that is locked down by Origin (e.g. rpc.mainnet.conspulse.com,
 * which returns 403 unless Origin matches the production site).
 *
 * Forwards HTTP requests and WebSocket upgrades to TARGET_HOST while
 * rewriting the Origin/Host headers, so `http://localhost:4545` behaves
 * exactly like the production RPC.
 *
 * Usage:
 *   node scripts/dev-rpc-proxy.mjs
 * Then point env at it:
 *   NEXT_PUBLIC_RPC_URL=http://localhost:4545
 *   NEXT_PUBLIC_RPC_WEBSOCKET=ws://localhost:4545
 */

import http from "node:http";
import https from "node:https";
import tls from "node:tls";

const TARGET_HOST = process.env.PROXY_TARGET_HOST || "rpc.mainnet.conspulse.com";
const SPOOF_ORIGIN = process.env.PROXY_ORIGIN || "https://mainnet.conspulse.com";
const PORT = Number(process.env.PROXY_PORT || 4545);

function forwardHeaders(reqHeaders) {
  const headers = { ...reqHeaders };
  delete headers["host"];
  delete headers["origin"];
  delete headers["referer"];
  headers["host"] = TARGET_HOST;
  headers["origin"] = SPOOF_ORIGIN;
  headers["referer"] = `${SPOOF_ORIGIN}/`;
  return headers;
}

const server = http.createServer((req, res) => {
  const proxyReq = https.request(
    {
      hostname: TARGET_HOST,
      port: 443,
      path: req.url,
      method: req.method,
      headers: forwardHeaders(req.headers),
    },
    (proxyRes) => {
      const headers = { ...proxyRes.headers };
      // Let the local browser read the response regardless of origin
      headers["access-control-allow-origin"] = "*";
      res.writeHead(proxyRes.statusCode || 500, headers);
      proxyRes.pipe(res);
    }
  );
  proxyReq.on("error", (err) => {
    res.writeHead(502, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "proxy_error", message: err.message }));
  });
  req.pipe(proxyReq);
});

// Raw WebSocket upgrade forwarding
server.on("upgrade", (req, clientSocket, head) => {
  const targetSocket = tls.connect({ host: TARGET_HOST, port: 443, servername: TARGET_HOST }, () => {
    const headers = forwardHeaders(req.headers);
    const lines = [`${req.method} ${req.url} HTTP/1.1`];
    for (const [k, v] of Object.entries(headers)) {
      lines.push(`${k}: ${v}`);
    }
    targetSocket.write(lines.join("\r\n") + "\r\n\r\n");
    if (head?.length) targetSocket.write(head);
    targetSocket.pipe(clientSocket);
    clientSocket.pipe(targetSocket);
  });

  const cleanup = () => {
    clientSocket.destroy();
    targetSocket.destroy();
  };
  targetSocket.on("error", cleanup);
  clientSocket.on("error", cleanup);
});

server.listen(PORT, () => {
  console.log(`Dev RPC proxy: http://localhost:${PORT} -> https://${TARGET_HOST} (Origin: ${SPOOF_ORIGIN})`);
});
