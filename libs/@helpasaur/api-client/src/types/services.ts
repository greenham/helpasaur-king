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
export interface ClientOptions {
  apiHost: string
  apiKey?: string
  serviceName: ServiceName
  webMode?: boolean
}

export interface ServiceAuthResponse {
  token: string
  expiresIn?: string
}
