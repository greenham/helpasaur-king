import { HelixStream, HelixUser } from "twitch-api-client"
import { TwitchStreamData, TwitchUserData } from "twitch-api-client/src/types"

// Extended stream type for runnerwatcher service
// Combines HelixStream data with custom properties added by our service
export interface WatchedTwitchStream {
  // Core HelixStream properties (made mutable for our service)
  id: string
  userId: string
  userName: string
  userDisplayName: string
  gameId: string
  gameName: string
  type: string
  title: string
  viewers: number
  startDate: Date
  language: string
  thumbnailUrl: string
  tags: string[]
  isMature: boolean

  // Custom properties added by runnerwatcher
  user?: HelixUser | TwitchUserData
  alert_sent_at?: Date
  [key: string]: any // Allow additional dynamic properties
}

// Helper function to convert HelixStream to WatchedTwitchStream
export function helixStreamToWatchedTwitchStream(
  helixStream: HelixStream,
  additionalProps?: Partial<WatchedTwitchStream>
): WatchedTwitchStream {
  return {
    id: helixStream.id,
    userId: helixStream.userId,
    userName: helixStream.userName,
    userDisplayName: helixStream.userDisplayName,
    gameId: helixStream.gameId,
    gameName: helixStream.gameName,
    type: helixStream.type,
    title: helixStream.title,
    viewers: helixStream.viewers,
    startDate: helixStream.startDate,
    language: helixStream.language,
    thumbnailUrl: helixStream.thumbnailUrl,
    tags: helixStream.tags,
    isMature: helixStream.isMature,
    ...additionalProps,
  }
}

// Helper function to convert TwitchStreamData to WatchedTwitchStream
export function twitchStreamDataToWatchedTwitchStream(
  streamData: TwitchStreamData,
  additionalProps?: Partial<WatchedTwitchStream>
): WatchedTwitchStream {
  return {
    id: streamData.id,
    userId: streamData.user_id,
    userName: streamData.user_login,
    userDisplayName: streamData.user_name,
    gameId: streamData.game_id,
    gameName: streamData.game_name,
    type: streamData.type,
    title: streamData.title,
    viewers: streamData.viewer_count,
    startDate: new Date(streamData.started_at),
    language: streamData.language,
    thumbnailUrl: streamData.thumbnail_url,
    tags: streamData.tags,
    isMature: streamData.is_mature,
    ...additionalProps,
  }
}
