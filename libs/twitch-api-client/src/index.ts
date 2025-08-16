import {
  ApiClient,
  HelixPaginatedStreamFilter,
  HelixEventSubSubscription,
} from "@twurple/api"
import { getRawData, DataObject } from "@twurple/common"
import {
  AppTokenAuthProvider,
  StaticAuthProvider,
  getTokenInfo,
} from "@twurple/auth"
import {
  EventSubConfig,
  SubscribeToStreamEventsOptions,
  TwitchApiConfig,
  TwitchStreamData,
  TwitchUserData,
  TwitchPrivilegedUserData,
  GetSubscriptionOptions,
} from "./types"

export const STREAM_ONLINE_EVENT = "stream.online"
export const CHANNEL_UPDATE_EVENT = "channel.update"

// Helper function to extract raw data from @twurple class instances using official API
export function convertTwurpleRawData<TData>(obj: DataObject<TData>): TData {
  // Use @twurple's official getRawData function
  return getRawData(obj)
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

  async getSubscriptions(
    params?: GetSubscriptionOptions
  ): Promise<HelixEventSubSubscription[]> {
    const subscriptions = await this.apiClient.eventSub.getSubscriptions()
    if (!subscriptions || !subscriptions.data) {
      return []
    }

    // Filter based on params if provided
    let subscriptionsData = subscriptions.data
    if (params && params.status) {
      subscriptionsData = subscriptionsData.filter(
        (sub: HelixEventSubSubscription) => sub.status === params.status
      )
    }
    if (params && params.type) {
      subscriptionsData = subscriptionsData.filter(
        (sub: HelixEventSubSubscription) => sub.type === params.type
      )
    }

    return subscriptionsData
  }

  async createSubscription(
    userId: string,
    type: string,
    version = "1"
  ): Promise<HelixEventSubSubscription> {
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

  async deleteSubscription(id: string): Promise<{ success: true }> {
    try {
      await this.apiClient.eventSub.deleteSubscription(id)
      return { success: true }
    } catch (error) {
      console.error(`Failed to delete subscription ${id}:`, error)
      throw error
    }
  }

  async clearSubscriptions(): Promise<
    PromiseSettledResult<{ success: true }>[]
  > {
    try {
      const subscriptions = await this.getSubscriptions()
      console.log(`Found ${subscriptions.length} subscriptions to delete...`)

      if (subscriptions.length === 0) {
        return []
      }

      const deletions = subscriptions.map((s: HelixEventSubSubscription) => {
        return this.deleteSubscription(s.id)
      })

      return await Promise.allSettled(deletions)
    } catch (error) {
      console.error(error)
      throw error
    }
  }

  async subscribeToStreamEvents(
    data: SubscribeToStreamEventsOptions
  ): Promise<PromiseSettledResult<HelixEventSubSubscription>[]> {
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
  ): Promise<TwitchStreamData[]> {
    try {
      const streams = await this.apiClient.streams.getStreams(filter)
      if (!streams) {
        return []
      }

      const result = streams.data.map((stream) =>
        convertTwurpleRawData<TwitchStreamData>(stream)
      )
      return result
    } catch (error) {
      console.error(`Failed to get streams:`, error)
      return []
    }
  }

  async getCurrentUserData(
    accessToken: string,
    withEmail: boolean = false
  ): Promise<TwitchPrivilegedUserData> {
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
      return convertTwurpleRawData<TwitchPrivilegedUserData>(user)
    } catch (error) {
      console.error(`Failed to get current user:`, error)
      throw error
    }
  }

  async getUserByName(name: string): Promise<TwitchUserData | null> {
    try {
      const user = await this.apiClient.users.getUserByName(name)
      if (!user) return null

      return convertTwurpleRawData<TwitchUserData>(user)
    } catch (error) {
      console.error(`Failed to get user by name ${name}:`, error)
      throw error
    }
  }

  async getUserById(id: string): Promise<TwitchUserData | null> {
    try {
      const user = await this.apiClient.users.getUserById(id)
      if (!user) return null

      return convertTwurpleRawData<TwitchUserData>(user)
    } catch (error) {
      console.error(`Failed to get user by id ${id}:`, error)
      throw error
    }
  }
}

// Re-export all types from @twurple/api
export * from "@twurple/api"

export default TwitchApiClient
