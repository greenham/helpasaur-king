import { TwitchStreamData, TwitchUserData } from "twitch-api-client/src/types"

export interface WatchedTwitchStream extends TwitchStreamData {
  lastAlertedAt?: number
  user?: TwitchUserData
  eventType: string
}
