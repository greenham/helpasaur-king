const { Server } = require("socket.io");
const { WEBSOCKET_RELAY_SERVER_PORT } = process.env;

const wss = new Server();
const relayEvents = ["streamAlert", "weeklyRaceRoomCreated"];

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

wss.listen(WEBSOCKET_RELAY_SERVER_PORT);

console.log(
  `Websocket relay server listening on port ${WEBSOCKET_RELAY_SERVER_PORT}`
);
