import { io, Socket } from "socket.io-client"
import { HelpaApi, ServiceName } from "@helpasaur/api-client"
import { RunnerWatcher } from "./lib/runner-watcher"
import { RunnerWatcherConfig, WatchedTwitchStream } from "./types"
import { name as packageName, version as packageVersion } from "../package.json"

const { WEBSOCKET_RELAY_SERVER } = process.env

const helpaApi = new HelpaApi({
  apiHost: process.env.API_HOST!,
  apiKey: process.env.API_KEY!,
  serviceName: process.env.SERVICE_NAME as ServiceName,
})

async function init(): Promise<void> {
  try {
    const config = await helpaApi.getServiceConfig()
    const runnerWatcherConfig = config.config as RunnerWatcherConfig
    const runnerwatcher = new RunnerWatcher(runnerWatcherConfig)
    const wsRelay: Socket = io(WEBSOCKET_RELAY_SERVER!, {
      query: { clientId: `${packageName} v${packageVersion}` },
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

    runnerwatcher.on("streamEvent", (data: WatchedTwitchStream) => {
      wsRelay.emit("streamAlert", data)
    })
  } catch (err) {
    console.error(err)
  }
}

init()
