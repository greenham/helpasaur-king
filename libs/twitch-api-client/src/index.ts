import {
  ApiClient,
  HelixPaginatedStreamFilter,
  HelixPrivilegedUser,
  HelixStream,
} from "@twurple/api"
import {
  AppTokenAuthProvider,
  StaticAuthProvider,
  getTokenInfo,
} from "@twurple/auth"

export const STREAM_ONLINE_EVENT = "stream.online"
export const CHANNEL_UPDATE_EVENT = "channel.update"

export interface SubscriptionData {
  channel: string
  userId: string
}

export interface EventSubConfig {
  webhookUrl: string
  secret: string
}

export interface TwitchApiConfig {
  client_id: string
  client_secret: string
  access_token?: string
  scopes?: string[]
  eventSub?: EventSubConfig
}

export class TwitchApiClient {
  public readonly apiClient: ApiClient
  private clientId: string
  private clientSecret: string
  private eventSubConfig?: EventSubConfig

  constructor(options: TwitchApiConfig) {
    this.clientId = options.client_id
    this.clientSecret = options.client_secret
    this.eventSubConfig = options.eventSub

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
    if (!this.eventSubConfig) {
      throw new Error("EventSub configuration not provided")
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
          callback: this.eventSubConfig.webhookUrl,
          secret: this.eventSubConfig.secret,
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

  async getStreams(
    filter?: HelixPaginatedStreamFilter
  ): Promise<HelixStream[]> {
    try {
      const streams = await this.apiClient.streams.getStreams(filter)
      return streams.data
    } catch (error) {
      console.error(`Failed to get streams:`, error)
      return []
    }
  }

  async getCurrentUserData(
    accessToken: string,
    withEmail: boolean = false
  ): Promise<HelixPrivilegedUser> {
    try {
      const tokenInfo = await getTokenInfo(accessToken)
      if (!tokenInfo || !tokenInfo.userId) {
        let error = `Failed to get current user: no valid token found!`
        console.error(error)
        throw error
      }
      const user = await this.apiClient.users.getAuthenticatedUser(
        tokenInfo.userId,
        withEmail
      )
      return user
    } catch (error) {
      console.error(`Failed to get current user:`, error)
      throw error
    }
  }

  async getUserByName(name: string): Promise<any> {
    try {
      const user = await this.apiClient.users.getUserByName(name)
      return user
    } catch (error) {
      console.error(`Failed to get user by name ${name}:`, error)
      throw error
    }
  }

  async getUserById(id: string): Promise<any> {
    try {
      const user = await this.apiClient.users.getUserById(id)
      return user
    } catch (error) {
      console.error(`Failed to get user by id ${id}:`, error)
      throw error
    }
  }
}

// Re-export all types from @twurple/api
export * from "@twurple/api"

export default TwitchApiClient
