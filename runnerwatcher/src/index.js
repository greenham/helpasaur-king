const axios = require("axios");
const { io } = require("socket.io-client");
const RunnerWatcher = require("./lib/runner-watcher");
const packageJson = require("../package.json");

const { API_URL, API_KEY, WEBSOCKET_RELAY_SERVER } = process.env;

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
    const wsRelay = io(WEBSOCKET_RELAY_SERVER, {
      query: { clientId: `${packageJson.name} v${packageJson.version}` },
    });

    console.log(
      `Connecting to websocket relay server: ${WEBSOCKET_RELAY_SERVER}...`
    );
    wsRelay.on("connect_error", (err) => {
      console.log(`Connection error!`);
      console.log(err);
    });
    wsRelay.on("connect", () => {
      console.log(`Connected! Socket ID: ${wsRelay.id}`);
    });

    runnerwatcher.on("streamEvent", (data) => {
      wsRelay.emit("streamAlert", data);
    });
  } catch (err) {
    console.error(err);
  }
}

init();

// Array.from(crypto.randomBytes(32), function (byte) {
//   return ("0" + (byte & 0xff).toString(16)).slice(-2);
// }).join("");
