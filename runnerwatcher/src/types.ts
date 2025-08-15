// Runner Watcher Configuration
export interface RunnerWatcherConfig {
  twitchClientId: string
  twitchClientSecret: string
  webhookSecret: string
  callbackUrl: string
  gamesToWatch?: string[]
  streamers?: string[]
}

// Stream Alert payload
export interface StreamAlertPayload {
  streamId?: string
  username?: string
  title?: string
  game?: string
  viewers?: number
  thumbnailUrl?: string
  startedAt?: string
  type?: "live" | "offline"
}
