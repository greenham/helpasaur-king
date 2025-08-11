"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const socket_io_1 = require("socket.io");
const http_1 = require("http");
const ms_1 = __importDefault(require("ms"));
const packageJson = __importStar(require("../package.json"));
const { WEBSOCKET_RELAY_SERVER_PORT } = process.env;
// Track relay stats
const startTime = Date.now();
let totalConnections = 0;
let currentConnections = 0;
let messagesRelayed = 0;
const eventCounts = {};
// Create main WebSocket server with health endpoint
const httpServer = (0, http_1.createServer)((req, res) => {
    // Serve health endpoint on main port
    if (req.url === "/health" &&
        (req.method === "GET" || req.method === "HEAD")) {
        const uptimeMs = Date.now() - startTime;
        // Get connected clients count
        let clientCount = 0;
        if (wss) {
            clientCount = wss.sockets.sockets.size || 0;
        }
        res.writeHead(200, { "Content-Type": "application/json" });
        // For HEAD requests, just send headers without body
        if (req.method === "HEAD") {
            res.end();
        }
        else {
            const healthData = {
                status: "healthy",
                service: "ws-relay",
                version: packageJson.version,
                uptime: (0, ms_1.default)(uptimeMs, { long: true }),
                uptimeMs: uptimeMs,
                connections: {
                    current: currentConnections,
                    total: totalConnections,
                    clients: clientCount,
                },
                messages: {
                    total: messagesRelayed,
                    byEvent: eventCounts,
                    rate: uptimeMs > 0
                        ? `${(messagesRelayed / (uptimeMs / 1000 / 60)).toFixed(2)}/min`
                        : "0/min",
                },
                port: WEBSOCKET_RELAY_SERVER_PORT,
                environment: process.env.NODE_ENV || "development",
            };
            res.end(JSON.stringify(healthData));
        }
    }
    else {
        // Let Socket.io handle other requests
        res.writeHead(404);
        res.end();
    }
});
const wss = new socket_io_1.Server(httpServer);
const relayEvents = [
    "streamAlert",
    "weeklyRaceRoomCreated",
    "joinChannel",
    "leaveChannel",
];
wss.on("connection", (socket) => {
    const clientId = socket.handshake.query.clientId || "Unknown";
    socket.data.clientId = clientId;
    totalConnections++;
    currentConnections++;
    console.log(`Client connected: ${socket.id} (${clientId})`);
    socket.on("disconnect", () => {
        currentConnections--;
        console.log(`Client disconnected: ${socket.id} (${socket.data.clientId})`);
    });
    relayEvents.forEach((event) => {
        socket.on(event, (data) => {
            console.log(`Received ${event} event:`, data);
            messagesRelayed++;
            eventCounts[event] = (eventCounts[event] || 0) + 1;
            const relayData = {
                payload: data,
                source: socket.data.clientId,
            };
            if (wss.emit(event, relayData))
                console.log(`✅ Relayed!`);
        });
    });
});
httpServer.listen(Number(WEBSOCKET_RELAY_SERVER_PORT) || 3001);
console.log(`Websocket relay server listening on port ${WEBSOCKET_RELAY_SERVER_PORT}`);
//# sourceMappingURL=index.js.map