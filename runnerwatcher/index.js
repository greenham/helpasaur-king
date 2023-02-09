const axios = require("axios");
const RunnerWatcher = require("./lib/runnerwatcher");

const { API_URL, API_KEY } = process.env;

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
  } catch (err) {
    console.error(err);
  }
}

init();

// Array.from(crypto.randomBytes(32), function (byte) {
//   return ("0" + (byte & 0xff).toString(16)).slice(-2);
// }).join("");
