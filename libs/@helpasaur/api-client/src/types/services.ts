// Service names
export type ServiceName =
  | "api"
  | "discord"
  | "twitch"
  | "streamAlerts"
  | "racebot"
  | "web"
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
  id?: string
  config: {
    [key: string]: any
  }
}
