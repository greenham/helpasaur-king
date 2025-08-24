import { ApiBase } from "../base"
import { ApiUser, TwitchBotConfig } from "@helpasaur/types"
import { ROUTES } from "../constants"

/**
 * API routes for user management
 * Handles current user information and authentication
 */
export class MeRoutes extends ApiBase {
  /**
   * Get current authenticated user information
   * @returns Promise resolving to current user data
   * @throws Error if the API request fails or user is not authenticated
   */
  async getCurrentUser(): Promise<ApiUser> {
    return this.apiGet(ROUTES.ME)
  }

  /**
   * Get current user's Twitch bot configuration
   * @returns Promise resolving to user's Twitch bot config
   * @throws Error if the API request fails or user is not authenticated
   */
  async getTwitchBotConfig(): Promise<TwitchBotConfig> {
    return this.apiGet(`${ROUTES.ME}/twitch`)
  }
}
