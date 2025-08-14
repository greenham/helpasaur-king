import { EventEmitter } from "events"
import { TwitchEventListener } from "./twitch-event-listener"
import TwitchApi from "node-twitch"
import { Constants } from "../constants"
import { RunnerWatcherConfig, StreamAlertPayload } from "@helpasaur/types"

// Type definition for node-twitch StreamData
interface StreamData {
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

const { TWITCH_WEBHOOK_LISTENER_PORT } = process.env
const { STREAM_ONLINE_EVENT, CHANNEL_UPDATE_EVENT, STREAM_ONLINE_TYPE_LIVE } =
  Constants
const DELAY_FOR_API_SECONDS = 10
const ALERT_DELAY_SECONDS = 15 * 60

// Maintain a cache of streams we've recently alerted
interface CachedStream {
  streamId: string
  alertedAt: Date
}
let cachedStreams: CachedStream[] = []

export class RunnerWatcher extends EventEmitter {
  private config: RunnerWatcherConfig
  private listener: TwitchEventListener
  private twitchApi?: TwitchApi

  constructor(config: RunnerWatcherConfig) {
    super()

    this.config = config

    if (!this.config.twitchClientId || !this.config.twitchClientSecret) {
      throw new Error(
        `Missing config parameter! clientId and clientSecret must be set.`
      )
    }

    this.listener = new TwitchEventListener()

    this.init()
  }

  init(): void {
    this.listener.listen(parseInt(TWITCH_WEBHOOK_LISTENER_PORT || "3010", 10))

    this.listener.on("notification", async (notification: any) => {
      console.log("\r\n-------------------------------------\r\n")
      console.log(
        `Received ${notification.subscription.type} event for ${notification.event.broadcaster_user_login}`
      )
      console.log(notification.event)
      console.log(`Processing event in ${DELAY_FOR_API_SECONDS} seconds...`)

      // Waiting here to ensure fresh data is available via Twitch API
      setTimeout(() => {
        this.processEvent(notification)
      }, DELAY_FOR_API_SECONDS * 1000)
    })
  }

  async processEvent(notification: any): Promise<void> {
    const { subscription, event } = notification

    // stream.online
    if (subscription.type === STREAM_ONLINE_EVENT) {
      // Immediately add this streamId to our cache to avoid multiple alerts
      // Twitch sometimes duplicates these events, so let's block them here
      const cachedStream = cachedStreams.find((s) => s.streamId === event.id)
      if (cachedStream) {
        return console.log(
          `Ignoring duplicate stream.online event for stream ${event.id}`
        )
      } else {
        console.log(`Adding stream ${event.id} to cache`)
        cachedStreams.push({
          streamId: event.id,
          alertedAt: new Date(),
        })
      }

      // Check if stream.type is live
      if (event.type !== STREAM_ONLINE_TYPE_LIVE) {
        return console.log(
          `Ignoring ${subscription.type} event with stream.type of "${event.type}"`
        )
      }

      // Check if this user is in the streamers list
      if (!this.streamerIsListed(event.broadcaster_user_login)) {
        return console.log(
          `Ignoring ${subscription.type} event for unlisted streamer ${event.broadcaster_user_login}`
        )
      }

      // Stream is live, type is 'live', user is in the list, so let's alert!
      const streamData = await this.fetchStreamData(event.broadcaster_user_id)
      if (streamData) {
        return this.alertStream(streamData)
      }
    }
    // channel.update
    else if (subscription.type === CHANNEL_UPDATE_EVENT) {
      // If a channel update comes thru but the user is not live, we can ignore it
      const streamData = await this.fetchStreamData(event.broadcaster_user_id)
      if (!streamData) {
        return console.log(
          `Ignoring ${subscription.type} event for offline streamer ${event.broadcaster_user_login}`
        )
      }

      // Check if this user is in the streamers list
      if (!this.streamerIsListed(event.broadcaster_user_login)) {
        return console.log(
          `Ignoring ${subscription.type} event for unlisted streamer ${event.broadcaster_user_login}`
        )
      }

      // Check if stream is already in our cache
      const cachedStream = cachedStreams.find(
        (s) => s.streamId === streamData.id
      )
      if (cachedStream) {
        // If the stream is in the cache, check if it's been > ALERT_DELAY_SECONDS minutes since we last alerted
        const now = new Date()
        const alertedAt = new Date(cachedStream.alertedAt)
        const secondsSinceAlert = (now.getTime() - alertedAt.getTime()) / 1000
        if (secondsSinceAlert < ALERT_DELAY_SECONDS) {
          return console.log(
            `Ignoring ${subscription.type} event for stream ${streamData.id} (alerted ${secondsSinceAlert} seconds ago)`
          )
        }
      }

      // Stream is live, user is in the list, and we haven't alerted recently, so let's alert!
      console.log(`Adding stream ${streamData.id} to cache`)
      cachedStreams.push({
        streamId: streamData.id,
        alertedAt: new Date(),
      })
      return this.alertStream(streamData)
    }
  }

  streamerIsListed(username: string): boolean {
    const streamers = this.config.streamers || []
    return streamers.includes(username)
  }

  async fetchStreamData(userId: string): Promise<StreamData | null> {
    console.log(`Fetching stream data for user ${userId}...`)
    const api = await this.getTwitchApi()
    const response = await api.getStreams({ user_id: userId } as any)
    const streamData = response.data[0]
    if (!streamData) {
      return null
    }
    return streamData
  }

  alertStream(streamData: StreamData): void {
    const alert: StreamAlertPayload = {
      streamId: streamData.id,
      username: streamData.user_login,
      title: streamData.title,
      game: streamData.game_name,
      viewers: streamData.viewer_count,
      thumbnailUrl: streamData.thumbnail_url,
      startedAt: streamData.started_at,
      type: "live",
    }
    console.log(`Emitting stream alert for ${streamData.user_login}!`)
    this.emit("streamEvent", alert)
  }

  async getTwitchApi(): Promise<TwitchApi> {
    if (!this.twitchApi) {
      this.twitchApi = new TwitchApi({
        client_id: this.config.twitchClientId,
        client_secret: this.config.twitchClientSecret,
      })
    }
    return this.twitchApi
  }
}
