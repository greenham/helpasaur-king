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

// Type definition for node-twitch StreamData
export interface StreamData {
  id: string
  user_id: string
  user_login: string
  user_name: string
  game_id: string
  game_name: string
  type: string
  title: string
  viewer_count: number
  started_at: string
  language: string
  thumbnail_url: string
  tag_ids: string[]
  is_mature: boolean
}

export interface CachedStream {
  streamId: string
  alertedAt: Date
}
