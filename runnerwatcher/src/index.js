const { io } = require("socket.io-client")
const { HelpaApi } = require("helpa-api-client")
const RunnerWatcher = require("./lib/runner-watcher")
const packageJson = require("../package.json")

const { SERVICE_NAME, WEBSOCKET_RELAY_SERVER } = process.env

const helpaApi = new HelpaApi({
  apiHost: process.env.API_HOST,
  apiKey: process.env.API_KEY,
  serviceName: SERVICE_NAME,
})

async function init() {
  try {
    const streamAlertsConfig = await helpaApi.getServiceConfig(SERVICE_NAME)
    const runnerwatcher = new RunnerWatcher(streamAlertsConfig)
    const wsRelay = io(WEBSOCKET_RELAY_SERVER, {
      query: { clientId: `${packageJson.name} v${packageJson.version}` },
    })

    console.log(
      `Connecting to websocket relay server: ${WEBSOCKET_RELAY_SERVER}...`
    )
    wsRelay.on("connect_error", (err) => {
      console.log(`Connection error!`)
      console.log(err)
    })
    wsRelay.on("connect", () => {
      console.log(`Connected! Socket ID: ${wsRelay.id}`)
    })

    runnerwatcher.on("streamEvent", (data) => {
      wsRelay.emit("streamAlert", data)
    })
  } catch (err) {
    console.error(err)
  }
}

init()

// Array.from(crypto.randomBytes(32), function (byte) {
//   return ("0" + (byte & 0xff).toString(16)).slice(-2);
// }).join("");
