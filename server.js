import http from "http";

import ErikrafTdropWsServer from "./server/ws-server.js";

const port = parseInt(process.env.PORT, 10) || 3000;
const host = process.env.HOST || "0.0.0.0";

const rtcConfig = {
    sdpSemantics: "unified-plan",
    iceServers: []
};

const server = http.createServer((req, res) => {
    if (req.url === "/config") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
            lanOnly: true,
            rtcConfig
        }));
        return;
    }

    if (req.url === "/health") {
        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end("ok");
        return;
    }

    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("ErikrafT Drop LAN signaling server");
});

new ErikrafTdropWsServer(server, {
    rtcConfig,
    wsFallback: false,
    debugMode: process.env.DEBUG_MODE === "true",
    rateLimit: false,
    allowLocalOnly: true
});

server.listen(port, host, () => {
    console.log(`ErikrafT Drop LAN signaling server running at http://${host}:${port}/`);
    console.log("LAN-only mode enabled (local network connections only).");
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(err);
        process.exit(1);
    }
});
