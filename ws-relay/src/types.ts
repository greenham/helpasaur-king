import { Socket } from "socket.io"

// Import event types and payload types from shared types
import { RelayEvent } from "@helpasaur/types"

// Re-export for convenience
export { RelayEvent }

// Relay Data structure for all events
export interface RelayData<T = unknown> {
  payload: T
  source: string
}

// Extended Socket type to include custom data
export interface CustomSocket extends Socket {
  data: {
    clientId: string
  }
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
  port: number
  environment: string
}
