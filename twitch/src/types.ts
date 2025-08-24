export interface TwitchBotServiceConfig {
  username: string
  oauth: string
  channels: string[]
  clientId?: string
  clientSecret?: string
  cmdPrefix?: string
  blacklistedUsers?: string[]
}
