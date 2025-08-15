// WebSocket Relay Event Types
export type WebSocketRelayEvent =
  | "streamAlert"
  | "weeklyRaceRoomCreated"
  | "joinChannel"
  | "leaveChannel"

// Relay Data structure for all events
export interface RelayData<T = any> {
  payload: T
  source: string
}

// Stream Alert payload
export interface StreamAlertPayload {
  streamId?: string
  username?: string
  title?: string
  game?: string
  viewers?: number
  thumbnailUrl?: string
  startedAt?: string
  type?: "live" | "offline"
}

// Weekly Race Room payload
export interface WeeklyRaceRoomPayload {
  roomUrl?: string
  roomName?: string
  goal?: string
  startTime?: string
  status?: string
}

// Channel events payload
export interface ChannelPayload {
  channel: string
  username?: string
}

// WebSocket client connection options
export interface WebSocketClientOptions {
  clientId: string
}

// WebSocket server statistics
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
