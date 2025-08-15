// Runner Watcher Configuration
export interface RunnerWatcherConfig {
  twitchClientId: string
  twitchClientSecret: string
  webhookSecret: string
  callbackUrl: string
  gamesToWatch?: string[]
  streamers?: string[]
}
