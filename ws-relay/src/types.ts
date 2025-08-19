import { Socket } from "socket.io"

// WebSocket Relay Event Types
export type RelayEvent =
  | "streamAlert"
  | "weeklyRaceRoomCreated"
  | "joinChannel"
  | "leaveChannel"

// Relay Data structure for all events
export interface RelayData<T = any> {
  payload: T
  source: string
}

// Extended Socket type to include custom data
export interface CustomSocket extends Socket {
  data: {
    clientId: string
  }
}

// WebSocket client connection options
export interface WebSocketClientOptions {
  clientId: string
}

// WebSocket server health/statistics
export interface WebSocketServerStats {
  status: "healthy" | "unhealthy"
  service: string
  version: string
  uptime: string
  uptimeMs: number
  connections: {
    current: number
    total: number
    clients: number
  }
  messages: {
    total: number
    byEvent: Record<string, number>
    rate: string
  }
  port: string
  environment: string
}
