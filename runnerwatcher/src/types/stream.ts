import { TwitchStreamData, TwitchUserData } from "twitch-api-client"

export interface WatchedTwitchStream extends TwitchStreamData {
  lastAlertedAt?: number
  user?: TwitchUserData
  eventType: string
}
