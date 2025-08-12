// Service names
export type ServiceName =
  | "api"
  | "discord"
  | "twitch"
  | "runnerwatcher"
  | "racebot"
  | "ws-relay"

// Service configuration interface
export interface ServiceConfigOptions {
  apiHost: string
  apiKey: string
  serviceName: ServiceName
}

// Discord Bot types
export interface DiscordConfig {
  token: string
  clientId: string
  guildId?: string
  channels?: {
    streamAlerts?: string
    raceAlerts?: string
    general?: string
  }
}

// Twitch Bot types
export interface TwitchBotConfig {
  username: string
  oauth: string
  channels: string[]
  clientId?: string
  clientSecret?: string
}

// Runner Watcher types
export interface RunnerWatcherConfig {
  twitchClientId: string
  twitchClientSecret: string
  webhookSecret: string
  callbackUrl: string
  gamesToWatch?: string[]
}

// Race Bot types
export interface RaceBotConfig {
  racetimeToken: string
  racetimeCategory: string
  scheduleTime?: string
  goal?: string
}
