import { io, Socket } from "socket.io-client"
import { HelpaApi } from "@helpasaur/api-client"
import { RunnerWatcher } from "./lib/runner-watcher"
import { RunnerWatcherConfig, StreamAlertPayload } from "./types"

const packageJson = require("../package.json")

const { WEBSOCKET_RELAY_SERVER } = process.env

const helpaApi = new HelpaApi({
  apiHost: process.env.API_HOST!,
  apiKey: process.env.API_KEY!,
  serviceName: "runnerwatcher",
})

async function init(): Promise<void> {
  try {
    const streamAlertsConfig =
      (await helpaApi.getServiceConfig()) as RunnerWatcherConfig
    const runnerwatcher = new RunnerWatcher(streamAlertsConfig)
    const wsRelay: Socket = io(WEBSOCKET_RELAY_SERVER!, {
      query: { clientId: `${packageJson.name} v${packageJson.version}` },
    })

    console.log(
      `Connecting to websocket relay server: ${WEBSOCKET_RELAY_SERVER}...`
    )
    wsRelay.on("connect_error", (err: Error) => {
      console.log(`Connection error!`)
      console.log(err)
    })
    wsRelay.on("connect", () => {
      console.log(`Connected! Socket ID: ${wsRelay.id}`)
    })

    runnerwatcher.on("streamEvent", (data: StreamAlertPayload) => {
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
