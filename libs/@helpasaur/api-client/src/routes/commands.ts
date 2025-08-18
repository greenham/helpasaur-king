import { ApiBase } from "../base"
import { Command, CommandLogRequest } from "@helpasaur/types"
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
}
