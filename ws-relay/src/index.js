const { Server } = require("socket.io");
const { createServer } = require("http");
const { WEBSOCKET_RELAY_SERVER_PORT } = process.env;

// Create HTTP server with health check endpoint
const httpServer = createServer((req, res) => {
  if (req.url === "/health" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "healthy", service: "ws-relay" }));
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
  console.log(`Client connected: ${socket.id} (${clientId})`);
  socket.on("disconnect", () => {
    console.log(`Client disconnected: ${socket.id} (${socket.data.clientId})`);
  });

  relayEvents.forEach((event) => {
    socket.on(event, (data) => {
      console.log(`Received ${event} event:`, data);
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
