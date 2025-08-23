// Runner Watcher Configuration
export interface RunnerWatcherConfig {
  clientId: string
  clientSecret: string
  webhookSecret: string
  callbackUrl: string
  gamesToWatch?: string[]
  streamers?: string[]
  alttpGameIds: string[]
  statusFilters?: string
}
