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
  statusFilters: string[]
  blacklistedUsers: string[]
  twitch: {
    commandPrefixes: string[]
  }
}

// Stream Types (matches HelixStream from @twurple/api)
export interface TwitchStream {
  id: string
  userId: string
  userName: string
  userDisplayName: string
  gameId: string
  gameName: string
  type: string
  title: string
  viewers: number
  startDate: Date
  language: string
  thumbnailUrl: string
  tags: string[]
  isMature: boolean
  // Additional properties added by our system
  isOnAlertsList?: boolean
}

// Discord Types
export interface DiscordJoinUrlResponse {
  result: "success" | "error"
  message: string
  url?: string
}

// Twitch Bot Types
export interface TwitchBotChannelResponse {
  result: "success" | "error" | "noop"
  message?: string
  channel?: string
}

// Stream Alerts Types
export interface StreamAlertsChannel {
  id: string
  login: string
  display_name: string
  profile_image_url?: string
}

export interface StreamAlertsResponse {
  result: "success" | "error" | "noop"
  message?: string
  channels?: StreamAlertsChannel[]
}

// Mutation Response Types
export interface MutationResponse {
  result: "success" | "error" | "noop"
  message?: string
}

// Command Mutation Types
export interface CommandMutationResponse extends MutationResponse {
  command?: Command
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
