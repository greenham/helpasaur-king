/**
 * API Response Types for Helpasaur King
 * These types define the standardized response format used across all API endpoints
 */

// User Types
import { TwitchPrivilegedUserData, TwitchUserData } from "twitch-api-client"

export enum ApiResult {
  SUCCESS = "success",
  ERROR = "error",
  NOOP = "noop",
}

export interface ApiResponse<T = unknown> {
  result: ApiResult
  message?: string
  data?: T
}

export interface ErrorResponse {
  result: ApiResult.ERROR
  message: string
  error?: unknown
  code?: string
}

// Configuration Types
export type ConfigurationValue = Record<string, unknown>

// Service Config
export interface ServiceConfig {
  id?: string
  config: ConfigurationValue
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

// This interface extends TwitchPrivilegedUserData with our auth data
export interface TwitchUserDataWithAuth extends TwitchPrivilegedUserData {
  auth?: {
    access_token: string
    expires_at: number
    refresh_token: string
    scope: string[]
    token_type: string
  }
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
  twitchUserData: TwitchUserDataWithAuth
  permissions: string[]
  lastLogin: Date
  twitchBotConfig?: TwitchBotConfig
}

// Web Configuration Types
export interface StreamFilterConfig {
  blacklistedUsers: string[]
  channels: TwitchUserDataWithAuth[]
  statusFilters: string
}

export interface WebResource {
  href: string
  target: string
  rel: string
  icon?: string
  text: string
  divider?: boolean
}

export interface WebConfig {
  streams: StreamFilterConfig
  twitch: {
    commandPrefixes: string[]
  }
  resources: WebResource[]
}

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

// StreamAlertsChannel is just a TwitchUserData (channels in stream alerts are full user objects)
export type StreamAlertsChannel = TwitchUserData

// Concrete data types for API responses
export interface DiscordJoinUrl {
  url?: string
}

export interface TwitchBotChannelData {
  channel?: string
  twitchBotConfig?: TwitchBotConfig & { roomId?: string }
}

export interface CommandMutationData {
  command?: Command
}

export interface GuildConfigData {
  guild?: GuildConfig
}

export interface CommandFindData {
  command?: Command
}

// Map of channel name -> TwitchBotConfig
export interface ActiveChannelList {
  [channelName: string]: TwitchBotConfig
}

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
  alias: string
  source: "discord" | "twitch"
  username: string
  metadata?: Record<string, unknown>
}

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

// WebSocket Relay Event Types
export enum RelayEvent {
  STREAM_ALERT = "streamAlert",
  WEEKLY_RACE_ROOM_CREATED = "weeklyRaceRoomCreated",
  JOIN_TWITCH_CHANNEL = "joinChannel",
  LEAVE_TWITCH_CHANNEL = "leaveChannel",
  TWITCH_BOT_CONFIG_UPDATED = "twitchBotConfigUpdated",
}

// Test Event Payload
export interface TestEventPayload {
  eventType: RelayEvent
  payload: Record<string, unknown>
}

// Command Statistics Types
export interface CommandStatsOverview {
  totalUsage: number
  uniqueUsers: number
  uniqueCommands: number
  platformBreakdown: {
    discord: number
    twitch: number
  }
}

export interface TopCommand {
  command: string
  count: number
  percentage: string
}

export interface PlatformBreakdown {
  platform: string
  count: number
  uniqueUsers: number
  uniqueCommands: number
}

export interface TopUser {
  username: string
  platform: string
  count: number
  uniqueCommands: number
}

export interface CommandTimeline {
  date: string
  discord: number
  twitch: number
  total: number
}

export interface RecentCommandLog {
  _id: string
  createdAt: Date
  command: string
  alias?: string
  source: string
  username: string
  metadata?: Record<string, unknown>
}

export interface RecentCommandsResponse {
  logs: RecentCommandLog[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

export interface TopChannel {
  channel: string
  platform: "discord" | "twitch"
  count: number
  uniqueUsers: number
  uniqueCommands: number
  lastUsed: Date
  percentage: string
}
