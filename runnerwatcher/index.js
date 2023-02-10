const axios = require("axios");
const RunnerWatcher = require("./lib/RunnerWatcher");
const { Server } = require("socket.io");

const { API_URL, API_KEY, STREAM_ALERTS_WEBSOCKET_SERVER_PORT } = process.env;
const { STREAM_ONLINE_EVENT } = require("./constants");

const helpaApi = axios.create({
  baseURL: API_URL,
  headers: {
    Authorization: API_KEY,
  },
});

async function init() {
  try {
    const streamAlertsConfig = await helpaApi.get("/configs/streamAlerts");
    const runnerwatcher = new RunnerWatcher(streamAlertsConfig.data.config);
    const wss = new Server();

    wss.on("connection", (socket) => {
      console.log(`Client connected to stream alerts server: ${socket.id}`);
      socket.on("disconnect", () => {
        console.log(`Client disconnected: ${socket.id}`);
      });
    });

    wss.listen(STREAM_ALERTS_WEBSOCKET_SERVER_PORT);

    runnerwatcher.on(STREAM_ONLINE_EVENT, (data) => {
      wss.emit(STREAM_ONLINE_EVENT, data);
    });
  } catch (err) {
    console.error(err);
  }
}

init();

// Array.from(crypto.randomBytes(32), function (byte) {
//   return ("0" + (byte & 0xff).toString(16)).slice(-2);
// }).join("");
