import { ApiBase } from "../base"
import { ActiveChannelList } from "@helpasaur/types"
import { ROUTES } from "../constants"

/**
 * API routes for Configs
 */
export class ConfigsRoutes extends ApiBase {
  /**
   * Get list of active Twitch bot channels from service configuration
   * @returns Promise resolving to array of active channels
   * @throws Error if the API request fails or service is not authenticated
   */
  async getActiveTwitchBotChannels(): Promise<ActiveChannelList> {
    return this.apiGet(`${ROUTES.CONFIGS}/twitch/activeChannels`)
  }
}
