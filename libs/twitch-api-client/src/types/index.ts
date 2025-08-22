import { HelixEventSubSubscriptionStatus } from "@twurple/api"

export interface TwitchStreamData {
  id: string
  user_id: string
  user_login: string
  user_name: string
  game_id: string
  game_name: string
  community_ids: string[]
  type: string
  title: string
  tags: string[]
  viewer_count: number
  started_at: string
  language: string
  thumbnail_url: string
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

// Re-export for convenience
export type { TwitchUserData as BaseTwitchUserData }

export interface SubscribeToStreamEventsOptions {
  channel: string
  userId: string
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
