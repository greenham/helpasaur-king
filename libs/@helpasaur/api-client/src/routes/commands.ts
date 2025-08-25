import { ApiBase } from "../base"
import {
  Command,
  CommandLogRequest,
  CommandStatsOverview,
  TopCommand,
  PlatformBreakdown,
  TopUser,
  CommandTimeline,
  RecentCommandsResponse,
  TopChannel,
} from "@helpasaur/types"
import { ROUTES } from "../constants"

/**
 * API routes for bot command management
 * Handles all operations related to bot commands
 */
export class CommandRoutes extends ApiBase {
  /**
   * Get all commands from the API
   * @returns Promise resolving to array of commands
   * @throws Error if the API request fails
   */
  async getCommands(): Promise<Command[]> {
    return this.apiGet(ROUTES.COMMANDS)
  }

  /**
   * Create a new bot command
   * @param command - The command data to create (partial Command object)
   * @returns Promise resolving when command creation is complete
   * @throws Error if the API request fails or user is not authenticated
   */
  async createCommand(command: Partial<Command>): Promise<void> {
    return this.apiPost(ROUTES.COMMANDS, command)
  }

  /**
   * Update an existing bot command
   * @param command - The command object with updates (must include _id)
   * @returns Promise resolving when command update is complete
   * @throws Error if the API request fails or user is not authenticated
   */
  async updateCommand(
    command: Partial<Command> & { _id: string }
  ): Promise<void> {
    return this.apiPatch(`${ROUTES.COMMANDS}/${command._id}`, command)
  }

  /**
   * Delete an existing bot command
   * @param command - The command object to delete
   * @returns Promise resolving when command deletion is complete
   * @throws Error if the API request fails or user is not authenticated
   */
  async deleteCommand(command: Command): Promise<void> {
    return this.apiDelete(`${ROUTES.COMMANDS}/${command._id}`, command)
  }

  /**
   * Find a specific bot command by name
   * @param query - The command search request containing command name
   * @returns Promise resolving to the found command data (if any)
   * @throws Error if the API request fails or service is not authenticated
   */
  async findCommand(query: string): Promise<Command | null> {
    return this.apiPost<Command | null>(`${ROUTES.COMMANDS}/find`, {
      command: query,
    })
  }

  /**
   * Log usage of a bot command for analytics and monitoring
   * @param logData - The command usage log data including user, channel, and platform info
   * @returns Promise resolving when the log is recorded
   * @throws Error if the API request fails or service is not authenticated
   */
  async logCommandUsage(logData: CommandLogRequest): Promise<void> {
    return this.apiPost(`${ROUTES.COMMANDS}/logs`, logData)
  }

  /**
   * Get a specific bot command by its unique ID
   * @param commandId - The unique identifier of the command to retrieve
   * @returns Promise resolving to the command data
   * @throws Error if the API request fails or command is not found
   */
  async getCommandById(commandId: string): Promise<Command> {
    return this.apiGet(`${ROUTES.COMMANDS}/${commandId}`)
  }

  /**
   * Delete a specific bot command by its unique ID
   * @param commandId - The unique identifier of the command to delete
   * @returns Promise resolving when command deletion is complete
   * @throws Error if the API request fails or command is not found
   */
  async deleteCommandById(commandId: string): Promise<void> {
    return this.apiDelete(`${ROUTES.COMMANDS}/${commandId}`)
  }

  // ======== STATS METHODS ========

  /**
   * Get command statistics overview
   * @param timeRange - Optional time range filter (24h, 7d, 30d, 90d, all)
   * @returns Promise resolving to command statistics overview
   * @throws Error if the API request fails or user is not admin
   */
  async getCommandStatsOverview(
    timeRange?: string
  ): Promise<CommandStatsOverview> {
    const params = timeRange ? `?timeRange=${timeRange}` : ""
    return this.apiGet(`${ROUTES.COMMANDS}/stats/overview${params}`)
  }

  /**
   * Get top commands by usage
   * @param limit - Maximum number of commands to return (default: 10)
   * @param timeRange - Optional time range filter (24h, 7d, 30d, 90d, all)
   * @returns Promise resolving to array of top commands with usage counts
   * @throws Error if the API request fails or user is not admin
   */
  async getTopCommands(
    limit?: number,
    timeRange?: string
  ): Promise<TopCommand[]> {
    const params = new URLSearchParams()
    if (limit) params.append("limit", limit.toString())
    if (timeRange) params.append("timeRange", timeRange)
    const query = params.toString() ? `?${params.toString()}` : ""
    return this.apiGet(`${ROUTES.COMMANDS}/stats/top-commands${query}`)
  }

  /**
   * Get platform breakdown statistics
   * @param timeRange - Optional time range filter (24h, 7d, 30d, 90d, all)
   * @returns Promise resolving to platform breakdown data
   * @throws Error if the API request fails or user is not admin
   */
  async getPlatformBreakdown(timeRange?: string): Promise<PlatformBreakdown[]> {
    const params = timeRange ? `?timeRange=${timeRange}` : ""
    return this.apiGet(`${ROUTES.COMMANDS}/stats/platform-breakdown${params}`)
  }

  /**
   * Get top users by command usage
   * @param limit - Maximum number of users to return (default: 10)
   * @param timeRange - Optional time range filter (24h, 7d, 30d, 90d, all)
   * @returns Promise resolving to array of top users
   * @throws Error if the API request fails or user is not admin
   */
  async getTopUsers(limit?: number, timeRange?: string): Promise<TopUser[]> {
    const params = new URLSearchParams()
    if (limit) params.append("limit", limit.toString())
    if (timeRange) params.append("timeRange", timeRange)
    const query = params.toString() ? `?${params.toString()}` : ""
    return this.apiGet(`${ROUTES.COMMANDS}/stats/top-users${query}`)
  }

  /**
   * Get command usage timeline
   * @param timeRange - Time range for the timeline (24h, 7d, 30d, 90d, all)
   * @param interval - Interval for grouping (hour, day)
   * @returns Promise resolving to timeline data
   * @throws Error if the API request fails or user is not admin
   */
  async getCommandTimeline(
    timeRange?: string,
    interval?: string
  ): Promise<CommandTimeline[]> {
    const params = new URLSearchParams()
    if (timeRange) params.append("timeRange", timeRange)
    if (interval) params.append("interval", interval)
    const query = params.toString() ? `?${params.toString()}` : ""
    return this.apiGet(`${ROUTES.COMMANDS}/stats/timeline${query}`)
  }

  /**
   * Get recent command logs
   * @param page - Page number for pagination (default: 1)
   * @param limit - Number of items per page (default: 20)
   * @returns Promise resolving to recent command logs with pagination
   * @throws Error if the API request fails or user is not admin
   */
  async getRecentCommands(
    page?: number,
    limit?: number
  ): Promise<RecentCommandsResponse> {
    const params = new URLSearchParams()
    if (page) params.append("page", page.toString())
    if (limit) params.append("limit", limit.toString())
    const query = params.toString() ? `?${params.toString()}` : ""
    return this.apiGet(`${ROUTES.COMMANDS}/stats/recent${query}`)
  }

  /**
   * Get top channels/guilds by command usage
   * @param limit - Maximum number of channels to return (default: 10)
   * @param timeRange - Optional time range filter (24h, 7d, 30d, 90d, all)
   * @param platform - Optional platform filter ('discord', 'twitch', or undefined for both)
   * @returns Promise resolving to array of top channels with usage counts
   * @throws Error if the API request fails or user is not admin
   */
  async getTopChannels(
    limit?: number,
    timeRange?: string,
    platform?: string
  ): Promise<TopChannel[]> {
    const params = new URLSearchParams()
    if (limit) params.append("limit", limit.toString())
    if (timeRange) params.append("timeRange", timeRange)
    if (platform) params.append("platform", platform)
    const query = params.toString() ? `?${params.toString()}` : ""
    return this.apiGet(`${ROUTES.COMMANDS}/stats/top-channels${query}`)
  }

  /**
   * Get all unique tags currently in use
   * @returns Promise resolving to array of tag names
   * @throws Error if the API request fails
   */
  async getTags(): Promise<string[]> {
    return this.apiGet(`${ROUTES.COMMANDS}/tags`)
  }

  /**
   * Get tag usage statistics
   * @returns Promise resolving to array of tag stats with counts
   * @throws Error if the API request fails
   */
  async getTagStats(): Promise<Array<{ tag: string; count: number }>> {
    return this.apiGet(`${ROUTES.COMMANDS}/tags/stats`)
  }

  /**
   * Get count of commands without tags
   * @returns Promise resolving to untagged command count
   * @throws Error if the API request fails
   */
  async getUntaggedCount(): Promise<number> {
    return this.apiGet(`${ROUTES.COMMANDS}/untagged-count`)
  }
}
