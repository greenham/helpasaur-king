import { ApiBase } from "../base"
import {
  TwitchBotConfig,
  ConfigUpdatePayload,
  ActiveChannelList,
} from "@helpasaur/types"
import { ROUTES } from "../constants"

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
    return this.apiGet(`${ROUTES.ME}/twitch`)
  }

  /**
   * Update Twitch bot configuration for the current authenticated user
   * @param config - The configuration updates to apply
   * @returns Promise resolving when the update is complete
   * @throws Error if the API request fails or user is not authenticated
   */
  async updateTwitchBotConfig(config: ConfigUpdatePayload): Promise<void> {
    return this.apiPatch(`${ROUTES.TWITCH}/config`, config)
  }

  /**
   * Join a Twitch channel with the bot
   * @param twitchUsername - The Twitch username/channel to join
   * @returns void
   * @throws Error if the API request fails or user is not authenticated
   */
  async joinTwitchChannel(twitchUsername: string): Promise<void> {
    return this.apiPost<void>(`${ROUTES.TWITCH}/join`, {
      channel: twitchUsername,
    })
  }

  /**
   * Leave a Twitch channel with the bot
   * @param twitchUsername - The Twitch username/channel to leave
   * @returns void
   * @throws Error if the API request fails or user is not authenticated
   */
  async leaveTwitchChannel(twitchUsername: string): Promise<void> {
    return this.apiPost<void>(`${ROUTES.TWITCH}/leave`, {
      channel: twitchUsername,
    })
  }

  /**
   * Get list of Twitch channels that the bot is currently in
   * @returns Promise resolving to array of channel names
   * @throws Error if the API request fails or user is not authenticated
   */
  async getTwitchBotChannels(): Promise<string[]> {
    return this.apiGet(`${ROUTES.TWITCH}/channels`)
  }

  /**
   * Get list of active Twitch channels from service configuration
   * @returns Promise resolving to array of active channels
   * @throws Error if the API request fails or service is not authenticated
   */
  async getActiveChannels(): Promise<ActiveChannelList> {
    return this.apiGet(`${ROUTES.CONFIGS}/twitch/activeChannels`)
  }
}
