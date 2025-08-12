import { io, Socket } from "socket.io-client"
import { HelpaApi } from "helpa-api-client"
import RunnerWatcher from "./lib/runner-watcher"
import * as packageJson from "../package.json"

const { SERVICE_NAME, WEBSOCKET_RELAY_SERVER } = process.env

const helpaApi = new HelpaApi({
  apiHost: process.env.API_HOST || "",
  apiKey: process.env.API_KEY || "",
  serviceName: SERVICE_NAME || "",
})

interface StreamEvent {
  eventType: string
  user: {
    id: string
    login: string
    name: string
  }
  stream: {
    id: string
    user_id: string
    user_login: string
    user_name: string
    game_id: string
    game_name: string
    type: string
    title: string
    viewer_count: number
    started_at: string
    language: string
    thumbnail_url: string
    tag_ids: string[]
    tags: string[]
    is_mature: boolean
  }
}

async function init(): Promise<void> {
  try {
    const streamAlertsConfig = await helpaApi.getServiceConfig()
    const runnerwatcher = new RunnerWatcher(streamAlertsConfig as any)
    const wsRelay: Socket = io(WEBSOCKET_RELAY_SERVER || "", {
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

    runnerwatcher.on("streamEvent", (data: StreamEvent) => {
      wsRelay.emit("streamAlert", data)
    })
  } catch (err) {
    console.error(err)
  }
}

init()
