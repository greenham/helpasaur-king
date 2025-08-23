import { HelixEventSubSubscriptionStatus } from "@twurple/api"

export interface TwitchStreamData {
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
  tag_ids?: string[]
  tags: string[]
  is_mature: boolean
}

export interface TwitchUserData {
  id: string
  login: string
  display_name: string
  description: string
  type: string
  broadcaster_type: string
  profile_image_url: string
  offline_image_url: string
  view_count: number
  created_at: string
}

export interface TwitchPrivilegedUserData extends TwitchUserData {
  email?: string
}

export enum TwitchStreamEventType {
  STREAM_ONLINE = "stream.online",
  CHANNEL_UPDATE = "channel.update",
  STREAM_OFFLINE = "stream.offline",
}

export enum TwitchStreamOnlineType {
  STREAM_LIVE = "live",
}

export interface SubscribeToStreamEventsOptions {
  channel: string
  userId: string
  events: TwitchStreamEventType[]
}

export interface EventSubConfig {
  webhookUrl: string
  secret: string
}

export interface TwitchApiConfig {
  client_id: string
  client_secret: string
  access_token?: string
  scopes?: string[]
  eventSub?: EventSubConfig
}

export interface GetSubscriptionOptions {
  status?: HelixEventSubSubscriptionStatus
  type?: string
  user_id?: string
}

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
export interface StreamAlertPayload extends TwitchStreamData {
  eventType: TwitchStreamEventType
  user: TwitchUserData
  lastAlertedAt?: number
}

// Weekly Race Payload for WebSocket relay
export interface WeeklyRacePayload {
  raceRoomUrl: string
  startTimestamp: number
}

export enum TwitchBotChannelActionType {
  JOIN = "join",
  LEAVE = "leave",
  CONFIG_UPDATED = "configUpdated",
}

// Channel Event Payload for bot coordination
export interface TwitchBotChannelActionPayload {
  action: TwitchBotChannelActionType
  channel: string
}

export interface TwitchBotChannelConfigUpdatePayload
  extends TwitchBotChannelActionPayload {
  action: TwitchBotChannelActionType.CONFIG_UPDATED
  config: Record<string, unknown>
}

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
