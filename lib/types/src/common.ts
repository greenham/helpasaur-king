// Common utility types

// Make all properties of T optional recursively
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

// Omit specific keys from type
export type OmitStrict<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>

// Environment type
export type Environment = "development" | "production" | "test"

// HTTP Methods
export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE"

// Platform types
export type Platform = "discord" | "twitch"

// Common error interface
export interface ErrorResponse {
  error: string
  message?: string
  statusCode?: number
  details?: any
}

// Health check response
export interface HealthCheckResponse {
  status: "healthy" | "unhealthy"
  service: string
  version?: string
  uptime?: string
  environment?: Environment
  details?: Record<string, any>
}
