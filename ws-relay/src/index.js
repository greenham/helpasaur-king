const { Server } = require("socket.io");
const { createServer } = require("http");
const ms = require("ms");
const packageJson = require("../package.json");
const { WEBSOCKET_RELAY_SERVER_PORT, WS_RELAY_HEALTH_PORT } = process.env;

// Track relay stats
const startTime = Date.now();
let totalConnections = 0;
let currentConnections = 0;
let messagesRelayed = 0;
const eventCounts = {};

// Create separate health check server if port is configured
let healthServer;
if (WS_RELAY_HEALTH_PORT) {
  healthServer = createServer((req, res) => {
    if (req.url === "/health" && (req.method === "GET" || req.method === "HEAD")) {
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
      } else {
        res.end(JSON.stringify({ 
          status: "healthy", 
          service: "ws-relay",
          version: packageJson.version,
          uptime: ms(uptimeMs, { long: true }),
          uptimeMs: uptimeMs,
          connections: {
            current: currentConnections,
            total: totalConnections,
            clients: clientCount
          },
          messages: {
            total: messagesRelayed,
            byEvent: eventCounts,
            rate: uptimeMs > 0 ? `${(messagesRelayed / (uptimeMs / 1000 / 60)).toFixed(2)}/min` : "0/min"
          },
          port: WEBSOCKET_RELAY_SERVER_PORT,
          healthPort: WS_RELAY_HEALTH_PORT,
          environment: process.env.NODE_ENV || "development",
        }));
      }
    } else {
      res.writeHead(404);
      res.end();
    }
  });
}

// Create main WebSocket server (with optional health endpoint if no separate health port)
const httpServer = createServer((req, res) => {
  // If no separate health port is configured, serve health on main port
  if (!WS_RELAY_HEALTH_PORT && req.url === "/health" && (req.method === "GET" || req.method === "HEAD")) {
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
    } else {
      res.end(JSON.stringify({ 
        status: "healthy", 
        service: "ws-relay",
        version: packageJson.version,
        uptime: ms(uptimeMs, { long: true }),
        uptimeMs: uptimeMs,
        connections: {
          current: currentConnections,
          total: totalConnections,
          clients: clientCount
        },
        messages: {
          total: messagesRelayed,
          byEvent: eventCounts,
          rate: uptimeMs > 0 ? `${(messagesRelayed / (uptimeMs / 1000 / 60)).toFixed(2)}/min` : "0/min"
        },
        port: WEBSOCKET_RELAY_SERVER_PORT,
        environment: process.env.NODE_ENV || "development",
      }));
    }
  } else {
    // Let Socket.io handle other requests
    res.writeHead(404);
    res.end();
  }
});

const wss = new Server(httpServer);
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
      if (wss.emit(event, relayData)) console.log(`✅ Relayed!`);
    });
  });
});

httpServer.listen(WEBSOCKET_RELAY_SERVER_PORT);

console.log(
  `Websocket relay server listening on port ${WEBSOCKET_RELAY_SERVER_PORT}`
);

// Start health check server if configured
if (healthServer && WS_RELAY_HEALTH_PORT) {
  healthServer.listen(WS_RELAY_HEALTH_PORT);
  console.log(
    `Health check server listening on port ${WS_RELAY_HEALTH_PORT}`
  );
}
