import { ApiBase } from "../base"
import { StreamAlertsChannel } from "@helpasaur/types"

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
    return this.apiGet("/api/streamAlerts/channels")
  }

  /**
   * Add a Twitch channel to stream alerts monitoring
   * @param twitchUsername - The Twitch username to add to stream alerts
   * @returns Promise resolving when the channel is added
   * @throws Error if the API request fails or user is not authenticated
   */
  async addChannelToStreamAlerts(twitchUsername: string): Promise<void> {
    return this.apiPost("/api/streamAlerts/channels", {
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
    return this.apiDelete(`/api/streamAlerts/channels/${twitchUserId}`)
  }
}
