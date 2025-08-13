import TwitchApi from "node-twitch"

const { TWITCH_EVENTSUB_SECRET_KEY, TWITCH_EVENTSUB_WEBHOOK_URL } = process.env
const STREAM_ONLINE_EVENT = "stream.online"
const CHANNEL_UPDATE_EVENT = "channel.update"

interface SubscriptionData {
  channel: string
  userId: string
}

interface EventSubSubscription {
  id: string
  type: string
  version: string
  status: string
  condition: any
  transport: any
}

class TwitchApiWithEventSub extends TwitchApi {
  constructor(options: any) {
    super(options)
  }

  getSubscriptions(
    params: any = false
  ): Promise<{ data: EventSubSubscription[] }> {
    let queryString = ""
    if (params) {
      queryString = "?" + new URLSearchParams(params).toString()
    }
    return (this as any)._get(`/eventsub/subscriptions${queryString}`)
  }

  createSubscription(
    userId: string,
    type: string,
    version = "1"
  ): Promise<any> {
    return (this as any)._post("/eventsub/subscriptions", {
      type,
      version,
      condition: {
        broadcaster_user_id: userId,
      },
      transport: {
        method: "webhook",
        callback: TWITCH_EVENTSUB_WEBHOOK_URL,
        secret: TWITCH_EVENTSUB_SECRET_KEY,
      },
    })
  }

  deleteSubscription(id: string): Promise<any> {
    return (this as any)._delete(`/eventsub/subscriptions?id=${id}`)
  }

  clearSubscriptions(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.getSubscriptions()
        .then((res) => {
          console.log(`Found ${res.data.length} subscriptions to delete...`)
          if (res.data.length === 0) {
            resolve()
            return
          }

          const deletions = res.data.map((s) => {
            return this.deleteSubscription(s.id)
          })

          Promise.allSettled(deletions).then(() => resolve())
        })
        .catch((err) => {
          console.error(err)
          resolve()
        })
    })
  }

  async subscribeToStreamEvents(
    data: SubscriptionData
  ): Promise<PromiseSettledResult<any>[]> {
    const events = [STREAM_ONLINE_EVENT, CHANNEL_UPDATE_EVENT]
    const { channel, userId } = data

    const subscriptions = events.map((event) => {
      console.log(`Creating ${event} event subscription for ${channel}`)
      return this.createSubscription(userId, event)
    })

    return await Promise.allSettled(subscriptions)
  }
}

export default TwitchApiWithEventSub
