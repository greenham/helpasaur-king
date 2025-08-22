/**
 * Twitch EventSub Types for Helpasaur King
 * These types define the structure of Twitch EventSub webhook notifications
 */

import { TwitchUserData } from "./api"

// Base EventSub Notification structure
export interface TwitchEventSubNotification<T = unknown> {
  subscription: {
    id: string
    status: string
    type: string
    version: string
    condition: Record<string, string>
    transport: {
      method: string
      callback?: string
    }
    created_at: string
    cost: number
  }
  event: T
}

// Stream Online Event
export interface StreamOnlineEvent {
  id: string
  broadcaster_user_id: string
  broadcaster_user_login: string
  broadcaster_user_name: string
  type: string
  started_at: string
}

// Channel Update Event
export interface ChannelUpdateEvent {
  broadcaster_user_id: string
  broadcaster_user_login: string
  broadcaster_user_name: string
  title: string
  language: string
  category_id: string
  category_name: string
  is_mature: boolean
}

// Stream Offline Event
export interface StreamOfflineEvent {
  broadcaster_user_id: string
  broadcaster_user_login: string
  broadcaster_user_name: string
}

// Complete webhook request body
export interface TwitchWebhookEvent {
  subscription: {
    id: string
    type: string
    version: string
    status: string
    cost: number
    condition: Record<string, string>
    transport: {
      method: string
      callback?: string
    }
    created_at: string
  }
  challenge?: string // Only present for webhook verification
  event?: StreamOnlineEvent | ChannelUpdateEvent | StreamOfflineEvent
}

// Stream Alert Payload for WebSocket relay
export interface StreamAlertPayload {
  eventType: "stream.online" | "channel.update" | "stream.offline"
  id: string
  user: TwitchUserData
  title: string
  thumbnail_url?: string
  started_at?: string
  game_name?: string
  is_mature?: boolean
}

// Weekly Race Payload for WebSocket relay
export interface WeeklyRacePayload {
  raceRoomUrl: string
  startTimestamp: number
  goal: string
  participants?: string[]
}

// Channel Event Payload for bot coordination
export interface ChannelEventPayload {
  action: "join" | "leave"
  channel: string
  userId?: string
  displayName?: string
}

// Union type for all possible event payloads
export type EventSubPayload =
  | StreamOnlineEvent
  | ChannelUpdateEvent
  | StreamOfflineEvent

// Type guard functions
export function isStreamOnlineEvent(
  event: unknown
): event is StreamOnlineEvent {
  return typeof event === "object" && event !== null && "started_at" in event
}

export function isChannelUpdateEvent(
  event: unknown
): event is ChannelUpdateEvent {
  return (
    typeof event === "object" &&
    event !== null &&
    "title" in event &&
    "category_name" in event
  )
}

export function isStreamOfflineEvent(
  event: unknown
): event is StreamOfflineEvent {
  return (
    typeof event === "object" &&
    event !== null &&
    "broadcaster_user_id" in event &&
    !("started_at" in event) &&
    !("title" in event)
  )
}
