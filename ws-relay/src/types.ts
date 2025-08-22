import { Socket } from "socket.io"

// WebSocket Relay Event Types
export enum RelayEvent {
  STREAM_ALERT = "streamAlert",
  WEEKLY_RACE_ROOM_CREATED = "weeklyRaceRoomCreated",
  JOIN_CHANNEL = "joinChannel",
  LEAVE_CHANNEL = "leaveChannel",
}

// Import payload types from shared types
import type {
  StreamAlertPayload,
  WeeklyRacePayload,
  ChannelEventPayload,
} from "@helpasaur/types"

// Relay Data structure for all events
export interface RelayData<T = unknown> {
  payload: T
  source: string
}

// Specific relay data types for each event
export type StreamAlertRelayData = RelayData<StreamAlertPayload>
export type WeeklyRaceRelayData = RelayData<WeeklyRacePayload>
export type ChannelEventRelayData = RelayData<ChannelEventPayload>

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
