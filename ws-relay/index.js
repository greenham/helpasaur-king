const { Server } = require("socket.io");
const { WEBSOCKET_RELAY_SERVER_PORT } = process.env;

const wss = new Server();
const relayEvents = ["streamAlert", "weeklyRaceRoomCreated"];

wss.on("connection", (socket) => {
  console.log(`Client connected to websocket relay: ${socket.id}`);
  socket.on("disconnect", () => {
    console.log(`Client disconnected: ${socket.id}`);
  });

  relayEvents.forEach((event) => {
    socket.on(event, (data) => {
      console.log(`Received ${event} event:`, data);
      if (wss.emit(event, data)) console.log(`-> Relayed!`);
    });
  });
});

wss.listen(WEBSOCKET_RELAY_SERVER_PORT);

console.log(
  `Websocket relay server listening on port ${WEBSOCKET_RELAY_SERVER_PORT}`
);
