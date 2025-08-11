import { EventEmitter } from "events"
import TwitchEventListener from "./twitch-event-listener"
import TwitchApi from "node-twitch"

const { TWITCH_WEBHOOK_LISTENER_PORT } = process.env
import {
  STREAM_ONLINE_EVENT,
  CHANNEL_UPDATE_EVENT,
  STREAM_ONLINE_TYPE_LIVE,
} from "../constants"

const DELAY_FOR_API_SECONDS = 10
const ALERT_DELAY_SECONDS = 15 * 60

interface RunnerWatcherConfig {
  clientId: string
  clientSecret: string
  [key: string]: any
}

interface TwitchUser {
  id: string
  login: string
  name: string
}

interface TwitchStream {
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
  tag_ids?: string[]
  tags?: string[]
  is_mature: boolean
}

interface TwitchNotification {
  subscription: {
    type: string
    [key: string]: any
  }
  event: {
    broadcaster_user_id: string
    broadcaster_user_login: string
    broadcaster_user_name: string
    type?: string
    started_at?: string
    title?: string
    category_id?: string
    category_name?: string
    is_mature?: boolean
    [key: string]: any
  }
}

interface CachedStream {
  id: string
  alertedAt: number
}

// Maintain a cache of streams we've recently alerted
let cachedStreams: CachedStream[] = []

class RunnerWatcher extends EventEmitter {
  private config: RunnerWatcherConfig
  private listener: TwitchEventListener

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

  private init(): void {
    this.listener.listen(Number(TWITCH_WEBHOOK_LISTENER_PORT) || 3012)

    this.listener.on("notification", async (notification: TwitchNotification) => {
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

  private async processEvent(notification: TwitchNotification): Promise<void> {
    const { subscription, event } = notification
    let eventType = subscription.type
    const user: TwitchUser = {
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

      let stream: TwitchStream = streamResult.data[0]

      // Replace some stream data from API if this is an update event
      if (eventType === CHANNEL_UPDATE_EVENT) {
        console.log(`Updating stream data from ${CHANNEL_UPDATE_EVENT} event`)
        stream.title = event.title || stream.title
        stream.game_id = event.category_id || stream.game_id
        stream.game_name = event.category_name || stream.game_name
        stream.is_mature = event.is_mature || stream.is_mature
      }

      // If this is a new stream, add it to the cache
      if (eventType === STREAM_ONLINE_EVENT) {
        cachedStreams.push({
          id: stream.id,
          alertedAt: Date.now(),
        })
      }

      // Clean up old cached streams
      this.cleanupCachedStreams()

      // Check if we should alert for this stream
      if (this.shouldAlert(stream, eventType)) {
        console.log(`✅ Alerting for ${user.login}'s stream!`)
        this.emit("streamEvent", {
          eventType,
          user,
          stream,
        })
      } else {
        console.log(`❌ Not alerting for ${user.login}'s stream (recently alerted or wrong type)`)
      }
    } catch (error) {
      console.error(`Error processing event:`, error)
    }
  }

  private shouldAlert(stream: TwitchStream, eventType: string): boolean {
    // Only alert for live streams
    if (stream.type !== STREAM_ONLINE_TYPE_LIVE) {
      return false
    }

    // For new streams, always alert
    if (eventType === STREAM_ONLINE_EVENT) {
      return true
    }

    // For updates, check if we've alerted recently
    const cachedStream = cachedStreams.find((cs) => cs.id === stream.id)
    if (!cachedStream) {
      // Haven't alerted for this stream before
      return true
    }

    const timeSinceAlert = Date.now() - cachedStream.alertedAt
    if (timeSinceAlert > ALERT_DELAY_SECONDS * 1000) {
      // Update the alert time
      cachedStream.alertedAt = Date.now()
      return true
    }

    return false
  }

  private cleanupCachedStreams(): void {
    const now = Date.now()
    const maxAge = 24 * 60 * 60 * 1000 // 24 hours

    cachedStreams = cachedStreams.filter((cs) => {
      return now - cs.alertedAt < maxAge
    })
  }
}

export default RunnerWatcher