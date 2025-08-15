import { ApiClient } from "@twurple/api"
import { AppTokenAuthProvider, StaticAuthProvider } from "@twurple/auth"

const { TWITCH_EVENTSUB_SECRET_KEY, TWITCH_EVENTSUB_WEBHOOK_URL } = process.env
const STREAM_ONLINE_EVENT = "stream.online"
const CHANNEL_UPDATE_EVENT = "channel.update"

interface SubscriptionData {
  channel: string
  userId: string
}

interface TwitchApiConfig {
  client_id: string
  client_secret: string
  access_token?: string
  scopes?: string[]
}

class TwitchApi {
  private apiClient: ApiClient
  private clientId: string
  private clientSecret: string

  constructor(options: TwitchApiConfig) {
    this.clientId = options.client_id
    this.clientSecret = options.client_secret

    // Use user access token if provided, otherwise use app token
    const authProvider = options.access_token
      ? new StaticAuthProvider(
          this.clientId,
          options.access_token,
          options.scopes
        )
      : new AppTokenAuthProvider(this.clientId, this.clientSecret)

    this.apiClient = new ApiClient({ authProvider })
  }

  async getSubscriptions(params: any = false): Promise<{ data: any[] }> {
    const subscriptions = await this.apiClient.eventSub.getSubscriptions()

    // Filter based on params if provided
    let data = subscriptions.data
    if (params && params.status) {
      data = data.filter((sub: any) => sub.status === params.status)
    }
    if (params && params.type) {
      data = data.filter((sub: any) => sub.type === params.type)
    }

    return { data }
  }

  async createSubscription(
    userId: string,
    type: string,
    version = "1"
  ): Promise<any> {
    if (!TWITCH_EVENTSUB_WEBHOOK_URL || !TWITCH_EVENTSUB_SECRET_KEY) {
      throw new Error("EventSub webhook URL and secret must be configured")
    }

    try {
      const subscription = await this.apiClient.eventSub.createSubscription(
        type,
        version,
        {
          broadcaster_user_id: userId,
        },
        {
          method: "webhook",
          callback: TWITCH_EVENTSUB_WEBHOOK_URL,
          secret: TWITCH_EVENTSUB_SECRET_KEY,
        }
      )
      return subscription
    } catch (error) {
      console.error(
        `Failed to create ${type} subscription for user ${userId}:`,
        error
      )
      throw error
    }
  }

  async deleteSubscription(id: string): Promise<any> {
    try {
      await this.apiClient.eventSub.deleteSubscription(id)
      return { success: true }
    } catch (error) {
      console.error(`Failed to delete subscription ${id}:`, error)
      throw error
    }
  }

  async clearSubscriptions(): Promise<void> {
    try {
      const res = await this.getSubscriptions()
      console.log(`Found ${res.data.length} subscriptions to delete...`)

      if (res.data.length === 0) {
        return
      }

      const deletions = res.data.map((s: any) => {
        return this.deleteSubscription(s.id)
      })

      await Promise.allSettled(deletions)
    } catch (err) {
      console.error(err)
    }
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

  // Additional methods needed for compatibility with existing code
  async getUsers(login: string): Promise<{ data: any[] }> {
    try {
      const user = await this.apiClient.users.getUserByName(login)
      return { data: user ? [user] : [] }
    } catch (error) {
      console.error(`Failed to get user ${login}:`, error)
      return { data: [] }
    }
  }

  async getStreams(filter: any): Promise<{ data: any[] }> {
    try {
      const params: any = {}

      if (filter.type) params.type = filter.type
      if (filter.first) params.limit = filter.first
      if (filter.game_id) {
        // Handle both single game ID and array of game IDs
        if (Array.isArray(filter.game_id)) {
          params.game = filter.game_id
        } else {
          params.game = [filter.game_id]
        }
      }
      if (filter.cursor) params.after = filter.cursor
      if (filter.user_id) params.userId = filter.user_id
      if (filter.channel) params.userId = filter.channel

      const streams = await this.apiClient.streams.getStreams(params)
      return { data: streams.data }
    } catch (error) {
      console.error(`Failed to get streams:`, error)
      return { data: [] }
    }
  }

  async getCurrentUser(): Promise<any> {
    try {
      const user = await this.apiClient.users.getAuthenticatedUser(
        this.clientId
      )
      return user
    } catch (error) {
      console.error(`Failed to get current user:`, error)
      throw error
    }
  }
}

export default TwitchApi
