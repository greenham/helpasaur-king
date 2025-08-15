// Twitch Bot Configuration
export interface TwitchBotConfig {
  username: string
  oauth: string
  channels: string[]
  clientId?: string
  clientSecret?: string
  cmdPrefix?: string
  blacklistedUsers?: string[]
}
