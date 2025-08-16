// API Response Types for Helpasaur King
// These types define the structure of responses from the API server

// Base API Response wrapper
export interface ApiResponse<T = any> {
  result: "success" | "error" | "noop"
  message?: string
  data?: T
}

// Command Types
export interface Command {
  _id: string
  command: string
  aliases: string[]
  response: string
  category: string
  enabled: boolean
  deleted?: boolean
}

// User Types
export interface TwitchUserData {
  id: string
  login: string
  display_name: string
  broadcaster_type?: string
  description?: string
  profile_image_url?: string
  offline_image_url?: string
  view_count?: number
  created_at?: string
  email?: string
}

export interface TwitchBotConfig {
  active: boolean
  commandsEnabled: boolean
  commandPrefix: string
  textCommandCooldown: number
  practiceListsEnabled: boolean
  allowModsToManagePracticeLists: boolean
  weeklyRaceAlertEnabled: boolean
  createdAt: Date
  lastUpdated: Date
}

export interface ApiUser {
  _id: string
  twitchUserData: TwitchUserData
  permissions: string[]
  lastLogin: Date
  twitchBotConfig?: TwitchBotConfig
}

// Web Configuration Types
export interface WebConfig {
  channels: TwitchUserData[]
  statusFilters: string
  blacklistedUsers: string[]
  twitch: {
    commandPrefixes: string[]
  }
}

// Stream Types (matches HelixStreamData from @twurple/api)
export interface TwitchStream {
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
  // Additional properties added by our system
  isOnAlertsList?: boolean
}

// Stream Alerts Types
export interface StreamAlertsChannel {
  id: string
  login: string
  display_name: string
  profile_image_url?: string
}

// Standardized Response Type Aliases using ApiResponse<T>
export type DiscordJoinUrlResponse = ApiResponse<{ url?: string }>
export type TwitchBotChannelResponse = ApiResponse<{
  channel?: string
  twitchBotConfig?: TwitchBotConfig & { roomId?: string }
}>
export type StreamAlertsResponse = ApiResponse<StreamAlertsChannel[]>
export type MutationResponse = ApiResponse<{}>
export type CommandMutationResponse = ApiResponse<{ command?: Command }>

// Configuration Update Types
export interface ConfigUpdatePayload {
  commandsEnabled?: boolean
  practiceListsEnabled?: boolean
  allowModsToManagePracticeLists?: boolean
  commandPrefix?: string
  textCommandCooldown?: number
  weeklyRaceAlertEnabled?: boolean
}

// Request Types (no changes needed)
export interface CommandFindRequest {
  command: string
}

export interface CommandLogRequest {
  command: string
  user: string
  channel: string
  platform: "discord" | "twitch"
  guildId?: string
  roomId?: string
}

// Standardized Response Types using ApiResponse<T>
export type ActiveChannelsResponse = ApiResponse<string[]>
export type CommandFindResponse = ApiResponse<{ command?: Command }>
export type CommandLogResponse = ApiResponse<{}>

// Discord Guild Configuration Types
export interface GuildConfig {
  _id?: string
  guildId?: string
  guildName?: string
  id?: string
  name?: string
  active: boolean
  cmdPrefix?: string
  textCmdCooldown?: number
  enableStreamAlerts: boolean
  streamAlertsChannelId?: string | null
  enableWeeklyRaceAlert: boolean
  enableWeeklyRaceRoomAlert?: boolean
  weeklyRaceAlertChannelId?: string | null
  weeklyRaceAlertRoleId?: string | null
  createdAt?: Date
  lastUpdated?: Date
}

export interface GuildConfigUpdate {
  guildName?: string
  name?: string
  active?: boolean
  cmdPrefix?: string
  textCmdCooldown?: number
  enableStreamAlerts?: boolean
  streamAlertsChannelId?: string | null
  enableWeeklyRaceAlert?: boolean
  enableWeeklyRaceRoomAlert?: boolean
  weeklyRaceAlertChannelId?: string | null
  weeklyRaceAlertRoleId?: string | null
}

export type GuildConfigResponse = ApiResponse<{ guild?: GuildConfig }>
