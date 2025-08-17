import { ApiBase } from "../base/ApiBase"
import {
  DiscordJoinUrl,
  GuildConfig,
  GuildConfigData,
  GuildConfigUpdate,
} from "../types"

/**
 * API routes for Discord bot management
 * Handles all operations related to Discord functionality
 */
export class DiscordRoutes extends ApiBase {
  /**
   * Get Discord server join URL from the API
   * @returns Promise resolving to Discord join URL data
   * @throws Error if the API request fails
   */
  async getDiscordJoinUrl(): Promise<DiscordJoinUrl> {
    return this.apiGet("/api/discord/joinUrl")
  }

  /**
   * Create Discord guild configuration for a new server
   * @param guildConfig - The guild configuration data to create
   * @returns Promise resolving to the created guild config
   * @throws Error if the API request fails or service is not authenticated
   */
  async createGuildConfig(guildConfig: GuildConfig): Promise<GuildConfigData> {
    return this.apiPost<GuildConfigData>("/api/discord/guild", guildConfig)
  }

  /**
   * Update Discord guild configuration settings
   * @param guildId - The Discord guild ID to update
   * @param updates - The configuration updates to apply
   * @returns Promise resolving to the updated guild config
   * @throws Error if the API request fails or service is not authenticated
   */
  async updateGuildConfig(
    guildId: string,
    updates: GuildConfigUpdate
  ): Promise<GuildConfigData> {
    return this.apiPatch<GuildConfigData>(
      `/api/discord/guild/${guildId}`,
      updates
    )
  }
}
