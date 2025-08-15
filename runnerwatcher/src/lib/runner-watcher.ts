import { EventEmitter } from "events"
import { TwitchEventListener } from "./twitch-event-listener"
import TwitchApi from "node-twitch"
import { Constants } from "../constants"
import {
  RunnerWatcherConfig,
  StreamAlertPayload,
  StreamData,
  CachedStream,
} from "../types"

const { TWITCH_WEBHOOK_LISTENER_PORT } = process.env
const { STREAM_ONLINE_EVENT, CHANNEL_UPDATE_EVENT, STREAM_ONLINE_TYPE_LIVE } =
  Constants
const DELAY_FOR_API_SECONDS = 10
const ALERT_DELAY_SECONDS = 15 * 60

// Maintain a cache of streams we've recently alerted
let cachedStreams: CachedStream[] = []

export class RunnerWatcher extends EventEmitter {
  private config: RunnerWatcherConfig
  private listener: TwitchEventListener
  private twitchApi?: TwitchApi

  constructor(config: RunnerWatcherConfig) {
    super()

    this.config = config

    if (!this.config.clientId || !this.config.clientSecret) {
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
      // Fetch stream data to validate it's actually live
      const streamData = await this.fetchStreamData(event.broadcaster_user_id)
      if (!streamData) {
        return console.log(
          `No stream data found for ${event.broadcaster_user_login}`
        )
      }

      // Check if stream.type is live (not playlist, watch_party, premiere, rerun)
      if (streamData.type !== STREAM_ONLINE_TYPE_LIVE) {
        return console.log(
          `Ignoring ${subscription.type} event - stream type is "${streamData.type}", not "live"`
        )
      }

      // Ensure stream is ALttP
      if (!this.config.alttpGameIds.includes(streamData.game_id)) {
        return console.log(
          `Not streaming configured game (${streamData.game_name}), skipping...`
        )
      }

      // Check if stream title passes filters
      if (this.config.statusFilters) {
        const speedrunTester = new RegExp(this.config.statusFilters, "i")
        if (
          !speedrunTester.test(streamData.title) &&
          !speedrunTester.test(streamData.title.replace(/\s/g, ""))
        ) {
          return console.log(`Stream title does not pass filters, skipping...`)
        }
      }

      // Check if we have a cached stream for this user
      const cachedStreamForUser = cachedStreams.find(
        (s) => s.user_id === streamData.user_id
      )

      if (cachedStreamForUser) {
        // Check if it's been long enough since the last alert
        const secondsSinceLastAlert = Math.floor(
          (Date.now() - cachedStreamForUser.lastAlertedAt) / 1000
        )
        if (secondsSinceLastAlert < ALERT_DELAY_SECONDS) {
          return console.log(
            `Only ${secondsSinceLastAlert} seconds since last alert, skipping...`
          )
        }

        // Check if this is the same stream ID (duplicate event)
        if (cachedStreamForUser.id === streamData.id) {
          return console.log(`Stream is already in the cache, skipping...`)
        }
      }

      // Remove any cached stream data for this user
      cachedStreams = cachedStreams.filter(
        (s) => s.user_id !== streamData.user_id
      )

      // Cache the new stream
      cachedStreams.push({
        id: streamData.id,
        user_id: streamData.user_id,
        title: streamData.title,
        game_id: streamData.game_id,
        lastAlertedAt: Date.now(),
      })

      // Stream is live, type is 'live', user is in the list, game is ALttP, title passes filters, so let's alert!
      return this.alertStream(streamData, STREAM_ONLINE_EVENT)
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

      // Check if stream.type is live (not playlist, watch_party, premiere, rerun)
      if (streamData.type !== STREAM_ONLINE_TYPE_LIVE) {
        return console.log(
          `Ignoring ${subscription.type} event - stream type is "${streamData.type}", not "live"`
        )
      }

      // Replace game data from the channel.update event
      streamData.game_id = event.category_id
      streamData.game_name = event.category_name
      streamData.title = event.title

      // Ensure stream is ALttP
      if (!this.config.alttpGameIds.includes(streamData.game_id)) {
        return console.log(
          `Not streaming configured game (${streamData.game_name}), skipping...`
        )
      }

      // Check if stream title passes filters
      if (this.config.statusFilters) {
        const speedrunTester = new RegExp(this.config.statusFilters, "i")
        if (
          !speedrunTester.test(streamData.title) &&
          !speedrunTester.test(streamData.title.replace(/\s/g, ""))
        ) {
          return console.log(`Stream title does not pass filters, skipping...`)
        }
      }

      // Check if we have a cached stream for this user
      const cachedStreamForUser = cachedStreams.find(
        (s) => s.user_id === streamData.user_id
      )

      // If this wasn't cached before (game wasn't ALttP or title didn't pass)
      // treat it as a stream.online event
      let eventType: string = CHANNEL_UPDATE_EVENT
      if (!cachedStreamForUser) {
        console.log(
          `Stream not found in cache after ${CHANNEL_UPDATE_EVENT}, treating as ${STREAM_ONLINE_EVENT}!`
        )
        eventType = STREAM_ONLINE_EVENT
      } else {
        // Check if it's been long enough since the last alert
        const secondsSinceLastAlert = Math.floor(
          (Date.now() - cachedStreamForUser.lastAlertedAt) / 1000
        )
        if (secondsSinceLastAlert < ALERT_DELAY_SECONDS) {
          return console.log(
            `Only ${secondsSinceLastAlert} seconds since last alert, skipping...`
          )
        }

        // Check if title or game actually changed
        if (
          cachedStreamForUser.title === event.title &&
          cachedStreamForUser.game_id === event.category_id
        ) {
          return console.log(`Title or game has not changed, skipping...`)
        }
      }

      // Remove any cached stream data for this user
      cachedStreams = cachedStreams.filter(
        (s) => s.user_id !== streamData.user_id
      )

      // Cache the updated stream
      cachedStreams.push({
        id: streamData.id,
        user_id: streamData.user_id,
        title: streamData.title,
        game_id: streamData.game_id,
        lastAlertedAt: Date.now(),
      })

      // Stream is live, user is in the list, and we haven't alerted recently, so let's alert!
      return this.alertStream(streamData, eventType)
    }
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

  async alertStream(streamData: StreamData, eventType: string): Promise<void> {
    // Fetch user data to match original payload structure
    const api = await this.getTwitchApi()
    const userResult = await api.getUsers(streamData.user_id)

    if (userResult && userResult.data && userResult.data[0]) {
      // Add user data to stream object to match original structure
      ;(streamData as any).user = userResult.data[0]
    }

    // Add eventType to match original structure
    ;(streamData as any).eventType = eventType

    console.log(`Emitting stream alert for ${streamData.user_login}!`)
    // Emit the full stream data object to match original behavior
    this.emit("streamEvent", streamData)
  }

  async getTwitchApi(): Promise<TwitchApi> {
    if (!this.twitchApi) {
      this.twitchApi = new TwitchApi({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
      })
    }
    return this.twitchApi
  }
}
