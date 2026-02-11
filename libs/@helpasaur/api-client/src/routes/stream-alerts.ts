import { ApiBase } from "../base"
import { StreamAlertsChannel, EventSubSubscription } from "@helpasaur/types"
import { ROUTES } from "../constants"

/**
 * API routes for stream alerts management
 * Handles monitoring and configuration of stream alert channels
 */
export class StreamAlertsRoutes extends ApiBase {
  /**
   * Get list of channels configured for stream alerts
   * @returns Promise resolving to array of stream alert channels
   * @throws Error if the API request fails
   */
  async getStreamAlertsChannels(): Promise<StreamAlertsChannel[]> {
    return this.apiGet(`${ROUTES.STREAM_ALERTS}/channels`)
  }

  /**
   * Add a Twitch channel to stream alerts monitoring
   * @param twitchUsername - The Twitch username to add to stream alerts
   * @returns Promise resolving when the channel is added
   * @throws Error if the API request fails or user is not authenticated
   */
  async addChannelToStreamAlerts(twitchUsername: string): Promise<void> {
    return this.apiPost(`${ROUTES.STREAM_ALERTS}/channels`, {
      channels: [twitchUsername],
    })
  }

  /**
   * Remove a Twitch channel from stream alerts monitoring
   * @param twitchUserId - The Twitch user ID to remove from stream alerts
   * @returns Promise resolving when the channel is removed
   * @throws Error if the API request fails or user is not authenticated
   */
  async removeChannelFromStreamAlerts(twitchUserId: string): Promise<void> {
    return this.apiDelete(`${ROUTES.STREAM_ALERTS}/channels/${twitchUserId}`)
  }

  /**
   * Get current EventSub subscriptions
   * @returns Promise resolving to array of EventSub subscriptions
   */
  async getEventSubSubscriptions(): Promise<EventSubSubscription[]> {
    return this.apiGet(`${ROUTES.STREAM_ALERTS}/subscriptions`)
  }

  /**
   * Clear all EventSub subscriptions
   * @returns Promise resolving when all subscriptions are cleared
   */
  async clearAllSubscriptions(): Promise<void> {
    return this.apiDelete(`${ROUTES.STREAM_ALERTS}/subscriptions/all`)
  }

  /**
   * Re-subscribe all currently watched channels
   * @returns Promise resolving with per-channel results
   */
  async resubscribeAllChannels(): Promise<unknown> {
    return this.apiPost(`${ROUTES.STREAM_ALERTS}/subscriptions/resubscribe`, {})
  }
}
