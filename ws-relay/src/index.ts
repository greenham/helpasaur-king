import { Server, Socket } from "socket.io"
import { createServer, IncomingMessage, ServerResponse } from "http"
import ms from "ms"
import {
  WebSocketRelayEvent,
  RelayData,
  WebSocketServerStats,
  WebSocketClientOptions,
} from "@helpasaur/types"
const packageJson = require("../package.json")
const { WEBSOCKET_RELAY_SERVER_PORT } = process.env

// Track relay stats
const startTime = Date.now()
let totalConnections = 0
let currentConnections = 0
let messagesRelayed = 0
const eventCounts: Record<string, number> = {}

// Extended Socket type to include custom data
interface CustomSocket extends Socket {
  data: {
    clientId: string
  }
}

// Create main WebSocket server with health endpoint
const httpServer = createServer((req: IncomingMessage, res: ServerResponse) => {
  // Serve health endpoint on main port
  if (
    req.url === "/health" &&
    (req.method === "GET" || req.method === "HEAD")
  ) {
    const uptimeMs = Date.now() - startTime

    // Get connected clients count
    let clientCount = 0
    if (wss) {
      clientCount = wss.sockets.sockets.size || 0
    }

    res.writeHead(200, { "Content-Type": "application/json" })

    // For HEAD requests, just send headers without body
    if (req.method === "HEAD") {
      res.end()
    } else {
      const stats: WebSocketServerStats = {
        status: "healthy",
        service: "ws-relay",
        version: packageJson.version,
        uptime: ms(uptimeMs, { long: true }),
        uptimeMs: uptimeMs,
        connections: {
          current: currentConnections,
          total: totalConnections,
          clients: clientCount,
        },
        messages: {
          total: messagesRelayed,
          byEvent: eventCounts,
          rate:
            uptimeMs > 0
              ? `${(messagesRelayed / (uptimeMs / 1000 / 60)).toFixed(2)}/min`
              : "0/min",
        },
        port: WEBSOCKET_RELAY_SERVER_PORT || "3001",
        environment:
          (process.env.NODE_ENV as WebSocketServerStats["environment"]) ||
          "development",
      }
      res.end(JSON.stringify(stats))
    }
  } else {
    // Let Socket.io handle other requests
    res.writeHead(404)
    res.end()
  }
})

const wss = new Server(httpServer)
const relayEvents: WebSocketRelayEvent[] = [
  "streamAlert",
  "weeklyRaceRoomCreated",
  "joinChannel",
  "leaveChannel",
]

wss.on("connection", (socket: Socket) => {
  const customSocket = socket as CustomSocket
  const clientId =
    (socket.handshake.query as WebSocketClientOptions).clientId || "Unknown"
  customSocket.data.clientId = clientId
  totalConnections++
  currentConnections++
  console.log(`Client connected: ${socket.id} (${clientId})`)
  socket.on("disconnect", () => {
    currentConnections--
    console.log(
      `Client disconnected: ${socket.id} (${customSocket.data.clientId})`
    )
  })

  relayEvents.forEach((event) => {
    socket.on(event, (data: any) => {
      console.log(`Received ${event} event:`, data)
      messagesRelayed++
      eventCounts[event] = (eventCounts[event] || 0) + 1
      const relayData: RelayData = {
        payload: data,
        source: customSocket.data.clientId,
      }
      if (wss.emit(event, relayData)) console.log(`✅ Relayed!`)
    })
  })
})

const port = WEBSOCKET_RELAY_SERVER_PORT || 3001
httpServer.listen(port)

console.log(`Websocket relay server listening on port ${port}`)
