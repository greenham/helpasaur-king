import TwitchApiClient from "twitch-api-client"

const { TWITCH_EVENTSUB_SECRET_KEY, TWITCH_EVENTSUB_WEBHOOK_URL } = process.env

// Re-export with EventSub configuration from environment
export default class TwitchApi extends TwitchApiClient {
  constructor(options: any) {
    super({
      ...options,
      eventSub:
        TWITCH_EVENTSUB_SECRET_KEY && TWITCH_EVENTSUB_WEBHOOK_URL
          ? {
              secret: TWITCH_EVENTSUB_SECRET_KEY,
              webhookUrl: TWITCH_EVENTSUB_WEBHOOK_URL,
            }
          : undefined,
    })
  }
}
