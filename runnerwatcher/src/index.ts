import { io, Socket } from "socket.io-client"
import { HelpaApi, ServiceName } from "@helpasaur/api-client"
import { RunnerWatcher } from "./lib/runner-watcher"
import { RunnerWatcherConfig, WatchedTwitchStream } from "./types"
import { config } from "./config"

const {
  apiHost,
  apiKey,
  serviceName,
  websocketRelayServer,
  packageName,
  packageVersion,
} = config

const helpaApi = new HelpaApi({
  apiHost,
  apiKey,
  serviceName: serviceName as ServiceName,
})

async function init(): Promise<void> {
  try {
    const config = await helpaApi.getServiceConfig()
    const runnerWatcherConfig = config.config as unknown as RunnerWatcherConfig
    const runnerwatcher = new RunnerWatcher(runnerWatcherConfig)
    const wsRelay: Socket = io(websocketRelayServer, {
      query: { clientId: `${packageName} v${packageVersion}` },
    })

    console.log(
      `Connecting to websocket relay server: ${websocketRelayServer}...`
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
