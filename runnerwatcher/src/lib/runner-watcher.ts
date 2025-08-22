import { EventEmitter } from "events"
import { TwitchEventListener } from "./twitch-event-listener"
import { TwitchApiClient } from "twitch-api-client"
import { Constants } from "../constants"
import { WatchedTwitchStream, RunnerWatcherConfig } from "../types"
import { config } from "../config"
import {
  TwitchEventSubNotification,
  StreamOnlineEvent,
  ChannelUpdateEvent,
  isChannelUpdateEvent,
} from "@helpasaur/types"

const { twitchWebhookListenerPort } = config
const {
  STREAM_ONLINE_EVENT,
  CHANNEL_UPDATE_EVENT,
  STREAM_ONLINE_TYPE_LIVE,
  DELAY_FOR_API_SECONDS,
  ALERT_DELAY_SECONDS,
} = Constants

// Maintain a cache of streams we've recently alerted
let cachedStreams: WatchedTwitchStream[] = []

class RunnerWatcher extends EventEmitter {
  config: RunnerWatcherConfig
  listener: TwitchEventListener

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
    this.listener.listen(twitchWebhookListenerPort)

    this.listener.on(
      "notification",
      async (
        notification: TwitchEventSubNotification<
          StreamOnlineEvent | ChannelUpdateEvent
        >
      ) => {
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
      }
    )
  }

  async processEvent(
    notification: TwitchEventSubNotification<
      StreamOnlineEvent | ChannelUpdateEvent
    >
  ): Promise<void> {
    const { subscription, event } = notification
    let eventType = subscription.type
    const user = {
      id: event.broadcaster_user_id,
      login: event.broadcaster_user_login,
      name: event.broadcaster_user_name,
    }

    try {
      const twitchApi = new TwitchApiClient({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
      })

      // Pull stream info from Twitch API
      const streamResult = await twitchApi.getStreams({
        userId: user.id,
      })

      // Make sure there's actually a stream
      if (!streamResult || !streamResult[0]) {
        console.log(`No streams found for ${user.login}!`)
        return
      }

      // Give us more control over this object
      const stream: WatchedTwitchStream = {
        ...streamResult[0],
        eventType,
      }

      // Replace some stream data from API if this is an update event
      if (eventType === CHANNEL_UPDATE_EVENT && isChannelUpdateEvent(event)) {
        stream.game_id = event.category_id
        stream.title = event.title
      }

      console.log(`Found stream for ${user.login}`)
      console.log(stream)

      // Make sure the stream is actually live
      // (we don't care about playlist, watch_party, premiere, rerun)
      if (stream.type !== STREAM_ONLINE_TYPE_LIVE) {
        console.log(`Stream is not live, skipping...`)
        return
      }

      // Ensure stream is alttp
      if (!this.config.alttpGameIds.includes(stream.game_id)) {
        console.log(`Not streaming configured game, skipping...`)
        return
      }

      // And passes filters
      const speedrunTester = new RegExp(this.config.statusFilters || "", "i")
      if (
        speedrunTester.test(stream.title) ||
        speedrunTester.test(stream.title.replace(/\s/g, ""))
      ) {
        console.log(`Stream title does not pass filters, skipping...`)
        return
      }

      // See if this user has a stream in the cache already
      const cachedStreamForUser = cachedStreams.find(
        (s) => s.user_id === stream.user_id
      )
      console.log(
        cachedStreamForUser
          ? `Found stream in cache for ${user.login}`
          : `No stream found in cache for ${user.login}`
      )

      // Make sure it's been long enough since the last alert for this user
      if (cachedStreamForUser && cachedStreamForUser.lastAlertedAt) {
        const secondsSinceLastAlert = Math.floor(
          (Date.now() - cachedStreamForUser.lastAlertedAt) / 1000
        )
        if (secondsSinceLastAlert < ALERT_DELAY_SECONDS) {
          console.log(
            `Only ${secondsSinceLastAlert} seconds since last alert, skipping...`
          )
          return
        }
      }

      // If this is a channel update, ensure the title or game changed
      if (eventType === CHANNEL_UPDATE_EVENT) {
        // Treat this as a stream.online event:
        // - If this wasn't cached before (meaning game was not alttp or title didn't pass)
        if (!cachedStreamForUser) {
          console.log(
            `Stream not found in cache after ${CHANNEL_UPDATE_EVENT}, treating as ${STREAM_ONLINE_EVENT}!`
          )
          eventType = STREAM_ONLINE_EVENT
        } else if (
          isChannelUpdateEvent(event) &&
          cachedStreamForUser.title === event.title &&
          cachedStreamForUser.game_id === event.category_id
        ) {
          console.log(`Title or game has not changed, skipping...`)
          return
        }
      } else if (
        eventType === STREAM_ONLINE_EVENT &&
        cachedStreamForUser &&
        cachedStreamForUser.id === stream.id
      ) {
        // This handles a weird scenario where:
        // - CHANNEL_UPDATE_EVENT gets fired
        // - we wait DELAY_FOR_API_SECONDS
        // - stream data is fetched via API
        // - stream comes back as live
        // - stream is not found in cache, gets treated as STREAM_ONLINE_EVENT
        // - the real STREAM_ONLINE_EVENT gets fired
        console.log(`Stream is already in the cache, skipping...`)
        return
      }

      // Pull user info
      try {
        const userData = await twitchApi.getUserById(user.id)
        if (userData) {
          stream.user = userData
        } else {
          console.log(`Unable to get data for user ${user.name}!`)
        }
      } catch (err) {
        console.log(`Unable to get data for user ${user.name}!`, err)
      }

      // Let the people know!
      stream.eventType = eventType
      this.emit("streamEvent", stream)

      // Remove any cached stream data for this user
      cachedStreams = cachedStreams.filter((s) => s.user_id !== stream.user_id)

      // Cache it
      stream.lastAlertedAt = Date.now()
      cachedStreams.push(stream)
    } catch (err) {
      console.error(err)
    }
  }
}

export { RunnerWatcher }
