import { ApiBase } from "../base"
import {
  TwitchBotConfig,
  TwitchBotChannelData,
  ConfigUpdatePayload,
  ActiveChannel,
} from "@helpasaur/types"

/**
 * API routes for Twitch bot management
 * Handles all operations related to Twitch bot configuration and channels
 */
export class TwitchRoutes extends ApiBase {
  /**
   * Get Twitch bot configuration for the current authenticated user
   * @returns Promise resolving to user's Twitch bot settings
   * @throws Error if the API request fails or user is not authenticated
   */
  async getTwitchBotConfig(): Promise<TwitchBotConfig> {
    return this.apiGet("/api/me/twitch")
  }

  /**
   * Update Twitch bot configuration for the current authenticated user
   * @param config - The configuration updates to apply
   * @returns Promise resolving when the update is complete
   * @throws Error if the API request fails or user is not authenticated
   */
  async updateTwitchBotConfig(config: ConfigUpdatePayload): Promise<void> {
    return this.apiPatch("/api/twitch/config", config)
  }

  /**
   * Join a Twitch channel with the bot
   * @param twitchUsername - The Twitch username/channel to join (optional, defaults to current user's channel)
   * @returns Promise resolving to channel join result and bot config
   * @throws Error if the API request fails or user is not authenticated
   */
  async joinTwitchChannel(
    twitchUsername?: string
  ): Promise<TwitchBotChannelData> {
    const body = twitchUsername ? { channel: twitchUsername } : {}
    return this.apiPost<TwitchBotChannelData>("/api/twitch/join", body)
  }

  /**
   * Leave a Twitch channel with the bot
   * @param twitchUsername - The Twitch username/channel to leave (optional, defaults to current user's channel)
   * @returns Promise resolving to channel leave result
   * @throws Error if the API request fails or user is not authenticated
   */
  async leaveTwitchChannel(
    twitchUsername?: string
  ): Promise<TwitchBotChannelData> {
    const body = twitchUsername ? { channel: twitchUsername } : {}
    return this.apiPost<TwitchBotChannelData>("/api/twitch/leave", body)
  }

  /**
   * Get list of Twitch channels that the bot is currently in
   * @returns Promise resolving to array of channel names
   * @throws Error if the API request fails or user is not authenticated
   */
  async getTwitchBotChannels(): Promise<string[]> {
    return this.apiGet("/api/twitch/channels")
  }

  /**
   * Get list of active Twitch channels from service configuration
   * @returns Promise resolving to array of active channels
   * @throws Error if the API request fails or service is not authenticated
   */
  async getActiveChannels(): Promise<ActiveChannel[]> {
    return this.apiGet("/api/configs/twitch/activeChannels")
  }
}
