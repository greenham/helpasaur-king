import { EventEmitter } from "events"
import { TwitchEventListener } from "./twitch-event-listener"
import TwitchApi from "node-twitch"

const { TWITCH_WEBHOOK_LISTENER_PORT } = process.env
import { Constants } from "../constants"
const { STREAM_ONLINE_EVENT, CHANNEL_UPDATE_EVENT, STREAM_ONLINE_TYPE_LIVE } =
  Constants
const DELAY_FOR_API_SECONDS = 10
const ALERT_DELAY_SECONDS = 15 * 60

// Maintain a cache of streams we've recently alerted
let cachedStreams: any[] = []

class RunnerWatcher extends EventEmitter {
  config: any
  listener: TwitchEventListener

  constructor(config: any) {
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
    let eventType = subscription.type
    const user = {
      id: event.broadcaster_user_id,
      login: event.broadcaster_user_login,
      name: event.broadcaster_user_name,
    }

    try {
      const twitchApi = new TwitchApi({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
      })

      // Pull stream info from Twitch API
      let streamResult = await twitchApi.getStreams({
        channel: user.id,
      })

      // Make sure there's actually a stream
      if (!streamResult || !streamResult.data || !streamResult.data[0]) {
        console.log(`No streams found for ${user.login}!`)
        return
      }

      let stream: any = streamResult.data[0]

      // Replace some stream data from API if this is an update event
      if (eventType === CHANNEL_UPDATE_EVENT) {
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
      const speedrunTester = new RegExp(this.config.statusFilters, "i")
      if (
        speedrunTester.test(stream.title) ||
        speedrunTester.test(stream.title.replace(/\s/g, ""))
      ) {
        console.log(`Stream title does not pass filters, skipping...`)
        return
      }

      // See if this user has a stream in the cache already
      let cachedStreamForUser = cachedStreams.find(
        (s) => s.user_id == stream.user_id
      )
      console.log(
        cachedStreamForUser
          ? `Found stream in cache for ${user.login}`
          : `No stream found in cache for ${user.login}`
      )

      // Make sure it's been long enough since the last alert for this user
      if (cachedStreamForUser) {
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
          cachedStreamForUser.title == event.title &&
          cachedStreamForUser.game_id == event.category_id
        ) {
          console.log(`Title or game has not changed, skipping...`)
          return
        }
      } else if (
        eventType === STREAM_ONLINE_EVENT &&
        cachedStreamForUser &&
        cachedStreamForUser.id == stream.id
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
      let userResult = await twitchApi.getUsers(user.id)
      if (!userResult || !userResult.data || !userResult.data[0]) {
        console.log(`Unable to get data for user ${user.name}!`)
      } else {
        stream.user = userResult.data[0]
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
