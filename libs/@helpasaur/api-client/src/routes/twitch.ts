import { ApiBase } from "../base"
import { ConfigUpdatePayload } from "@helpasaur/types"
import { ROUTES } from "../constants"

/**
 * API routes for Twitch bot management
 * Handles all operations related to Twitch bot configuration and channels
 */
export class TwitchRoutes extends ApiBase {
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
  async joinTwitchChannel(twitchUsername: string | undefined): Promise<void> {
    const payload = twitchUsername ? { channel: twitchUsername } : {}
    return this.apiPost<void>(`${ROUTES.TWITCH}/join`, payload)
  }

  /**
   * Leave a Twitch channel with the bot
   * @param twitchUsername - The Twitch username/channel to leave
   * @returns void
   * @throws Error if the API request fails or user is not authenticated
   */
  async leaveTwitchChannel(twitchUsername: string | undefined): Promise<void> {
    const payload = twitchUsername ? { channel: twitchUsername } : {}
    return this.apiPost<void>(`${ROUTES.TWITCH}/leave`, payload)
  }

  /**
   * Get list of Twitch channels that the bot is currently in
   * @returns Promise resolving to array of channel names
   * @throws Error if the API request fails or user is not authenticated
   */
  async getTwitchBotChannels(): Promise<string[]> {
    return this.apiGet(`${ROUTES.TWITCH}/channels`)
  }
}
