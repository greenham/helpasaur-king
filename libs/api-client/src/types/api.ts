// API Response types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Service names
export type ServiceName =
  | "api"
  | "discord"
  | "twitch"
  | "runnerwatcher"
  | "racebot"
  | "ws-relay"

// Service configuration options for API client
export interface ServiceConfigOptions {
  apiHost: string
  apiKey: string
  serviceName: ServiceName
}

// Service Authorization
export interface ServiceAuthResponse {
  token: string
  expiresIn?: string
}

// Service Config (generic config returned from API)
export interface ServiceConfig {
  [key: string]: any
}

// Temporary - for migration purposes
// TODO: Remove once services import from their own types
export interface TwitchBotConfig {
  username: string
  oauth: string
  channels: string[]
  clientId?: string
  clientSecret?: string
  cmdPrefix?: string
  blacklistedUsers?: string[]
}

// JWT Token payload
export interface JWTPayload {
  sub?: string
  username?: string
  serviceName?: string
  role?: string
  iat?: number
  exp?: number
}

// Twitch OAuth types
export interface TwitchTokenResponse {
  access_token: string
  refresh_token?: string
  expires_in?: number
  scope?: string[]
  token_type?: string
}

export interface TwitchUser {
  id: string
  login: string
  display_name: string
  type?: string
  broadcaster_type?: string
  description?: string
  profile_image_url?: string
  offline_image_url?: string
  email?: string
  created_at?: string
}

// Pagination
export interface PaginationOptions {
  page?: number
  limit?: number
  sort?: string
  order?: "asc" | "desc"
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}
