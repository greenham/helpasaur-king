import axios, { AxiosInstance, AxiosError } from "axios"
import axiosRetry from "axios-retry"
import { ApiResult } from "@helpasaur/types"
import {
  ServiceConfigOptions,
  ServiceConfig,
  ServiceName,
  Command,
  ApiUser,
  WebConfig,
  TwitchStream,
  DiscordJoinUrl,
  TwitchBotConfig,
  TwitchBotChannelData,
  StreamAlertsChannel,
  ConfigUpdatePayload,
  ActiveChannel,
  CommandFindRequest,
  CommandLogRequest,
  GuildConfig,
  GuildConfigUpdate,
  GuildConfigData,
} from "./types"

/**
 * Helps external clients and internal services use the Helpa API
 */
export class HelpaApi {
  private apiHost: string
  private apiKey: string | undefined
  private serviceName: ServiceName
  private webMode: boolean
  private accessToken: string | null = null
  public readonly api: AxiosInstance

  /**
   * Constructs a new HelpaApi instance.
   * @param options - The options for configuring the HelpaApi instance.
   * @throws {Error} If any of the required constructor values are missing.
   */
  constructor(options: ServiceConfigOptions) {
    const { apiHost, apiKey, serviceName, webMode = false } = options

    this.apiHost = apiHost
    this.apiKey = apiKey
    this.serviceName = serviceName
    this.webMode = webMode

    // Throw an error if any of the required constructor values are missing
    if (!this.apiHost || !this.serviceName) {
      throw new Error(`HelpaApi constructor requires apiHost and serviceName`)
    }

    // API key is required for service mode, optional for web mode
    if (!this.webMode && !this.apiKey) {
      throw new Error(
        `HelpaApi constructor requires apiKey when not in webMode`
      )
    }

    this.api = axios.create({
      baseURL: this.apiHost,
      headers: { "X-Service-Name": serviceName },
      withCredentials: this.webMode, // Include cookies for web mode
      validateStatus: () => true, // Don't throw on any HTTP status code
    })

    axiosRetry(this.api, {
      retries: 20,
      retryDelay: () => 10000,
      onRetry: (retryCount: number, error: AxiosError, requestConfig: any) => {
        console.log(`🔴 API Request Error:`, error.toString())
        console.log(
          `🔁 Retrying call to ${requestConfig.url} (attempt #${retryCount})`
        )
      },
    })
  }

  /**
   * Authorizes the service with the API using the provided API key
   * In web mode, this method always returns true as user auth is handled by cookies
   * @returns Promise resolving to true if service is authorized successfully, false otherwise
   * @throws Error logged to console if authorization fails (does not throw exception)
   */
  async authorizeService(): Promise<boolean> {
    // Skip authorization in web mode - user auth handled by cookies
    if (this.webMode) {
      return true
    }

    try {
      const result = await this.api.get(`${this.apiHost}/auth/service`, {
        headers: { Authorization: this.apiKey },
      })
      console.log(`✅ Service authorized with API!`)

      // Handle standardized API response format from server
      if (result.data.result === "success" && result.data.data?.token) {
        const token = result.data.data.token
        this.accessToken = token
        // Use JWT for all subsequent calls
        this.api.defaults.headers.common["Authorization"] = `Bearer ${token}`
        return true
      }

      throw new Error(result.data.message || "Authorization failed")
    } catch (err: any) {
      console.error(`🔴 Error authorizing service: ${err.message}`)
      return false
    }
  }

  /**
   * Retrieves the service configuration from the API
   * Automatically authorizes the service first if not already authenticated
   * @returns Promise resolving to the service configuration object
   * @throws Error if authorization fails or the API request fails
   */
  async getServiceConfig(): Promise<ServiceConfig> {
    try {
      // auth first if necessary
      let authorized = this.accessToken !== null
      if (!authorized) {
        authorized = await this.authorizeService()
      }

      if (!authorized) {
        throw new Error(`🔴 Unable to authorize service with API!`)
      }

      const response = await this.api.get(
        `${this.apiHost}/api/configs/${this.serviceName}`
      )

      // Handle standardized API response format
      if (response.data.result === "success" && response.data.data) {
        return response.data.data
      }

      throw new Error(response.data.message || "Failed to get service config")
    } catch (err: any) {
      throw new Error(`🔴 Error fetching service config: ${err.message}`)
    }
  }

  // Public endpoints (no authentication required)

  /**
   * Get all commands from the API
   * @returns Promise resolving to array of commands
   * @throws Error if the API request fails
   */
  async getCommands(): Promise<Command[]> {
    try {
      const response = await this.api.get("/api/commands")
      if (
        response.data.result === "success" &&
        response.data.data !== undefined
      ) {
        return response.data.data
      }
      throw new Error(response.data.message || "Failed to get commands")
    } catch (err: any) {
      throw new Error(`Failed to get commands: ${err.message}`)
    }
  }

  /**
   * Get live streams from the API
   * @returns Promise resolving to array of live Twitch streams
   * @throws Error if the API request fails
   */
  async getLivestreams(): Promise<TwitchStream[]> {
    try {
      const response = await this.api.get("/api/streams/live")
      if (
        response.data.result === "success" &&
        response.data.data !== undefined
      ) {
        return response.data.data
      }
      throw new Error(response.data.message || "Failed to get livestreams")
    } catch (err: any) {
      throw new Error(`Failed to get livestreams: ${err.message}`)
    }
  }

  /**
   * Get web configuration from the API
   * @returns Promise resolving to web app configuration
   * @throws Error if the API request fails
   */
  async getWebConfig(): Promise<WebConfig> {
    try {
      const response = await this.api.get("/api/web/config")
      if (
        response.data.result === "success" &&
        response.data.data !== undefined
      ) {
        return response.data.data
      }
      throw new Error(response.data.message || "Failed to get web config")
    } catch (err: any) {
      throw new Error(`Failed to get web config: ${err.message}`)
    }
  }

  /**
   * Get Discord server join URL from the API
   * @returns Promise resolving to Discord join URL data
   * @throws Error if the API request fails
   */
  async getDiscordJoinUrl(): Promise<DiscordJoinUrl> {
    try {
      const response = await this.api.get("/api/discord/joinUrl")
      if (
        response.data.result === "success" &&
        response.data.data !== undefined
      ) {
        return response.data.data
      }
      throw new Error(response.data.message || "Failed to get Discord join URL")
    } catch (err: any) {
      throw new Error(`Failed to get Discord join URL: ${err.message}`)
    }
  }

  // User-authenticated endpoints (require cookies in web mode)

  /**
   * Get current authenticated user information
   * @returns Promise resolving to current user data
   * @throws Error if the API request fails or user is not authenticated
   */
  async getCurrentUser(): Promise<ApiUser> {
    try {
      const response = await this.api.get("/api/me")
      if (
        response.data.result === "success" &&
        response.data.data !== undefined
      ) {
        return response.data.data
      }
      throw new Error(response.data.message || "Failed to get current user")
    } catch (err: any) {
      throw new Error(`Failed to get current user: ${err.message}`)
    }
  }

  /**
   * Get Twitch bot configuration for the current authenticated user
   * @returns Promise resolving to user's Twitch bot settings
   * @throws Error if the API request fails or user is not authenticated
   */
  async getTwitchBotConfig(): Promise<TwitchBotConfig> {
    try {
      const response = await this.api.get("/api/me/twitch")
      if (
        response.data.result === "success" &&
        response.data.data !== undefined
      ) {
        return response.data.data
      }
      throw new Error(
        response.data.message || "Failed to get Twitch bot config"
      )
    } catch (err: any) {
      throw new Error(`Failed to get Twitch bot config: ${err.message}`)
    }
  }

  /**
   * Update Twitch bot configuration for the current authenticated user
   * @param config - The configuration updates to apply
   * @returns Promise resolving when the update is complete
   * @throws Error if the API request fails or user is not authenticated
   */
  async updateTwitchBotConfig(config: ConfigUpdatePayload): Promise<void> {
    try {
      const response = await this.api.patch("/api/twitch/config", config)
      if (response.data.result !== "success") {
        throw new Error(
          response.data.message || "Failed to update Twitch bot config"
        )
      }
      // Return void on success
    } catch (err: any) {
      throw new Error(`Failed to update Twitch bot config: ${err.message}`)
    }
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
    try {
      const body = twitchUsername ? { channel: twitchUsername } : {}
      const response = await this.api.post("/api/twitch/join", body)
      if (
        response.data.result === "success" &&
        response.data.data !== undefined
      ) {
        return response.data.data
      }
      throw new Error(response.data.message || "Failed to join Twitch channel")
    } catch (err: any) {
      throw new Error(`Failed to join Twitch channel: ${err.message}`)
    }
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
    try {
      const body = twitchUsername ? { channel: twitchUsername } : {}
      const response = await this.api.post("/api/twitch/leave", body)
      if (
        response.data.result === "success" &&
        response.data.data !== undefined
      ) {
        return response.data.data
      }
      throw new Error(response.data.message || "Failed to leave Twitch channel")
    } catch (err: any) {
      throw new Error(`Failed to leave Twitch channel: ${err.message}`)
    }
  }

  /**
   * Get list of Twitch channels that the bot is currently in
   * @returns Promise resolving to array of channel names
   * @throws Error if the API request fails or user is not authenticated
   */
  async getTwitchBotChannels(): Promise<string[]> {
    try {
      const response = await this.api.get("/api/twitch/channels")
      if (
        response.data.result === "success" &&
        response.data.data !== undefined
      ) {
        return response.data.data
      }
      throw new Error(
        response.data.message || "Failed to get Twitch bot channels"
      )
    } catch (err: any) {
      throw new Error(`Failed to get Twitch bot channels: ${err.message}`)
    }
  }

  /**
   * Create a new bot command
   * @param command - The command data to create (partial Command object)
   * @returns Promise resolving when command creation is complete
   * @throws Error if the API request fails or user is not authenticated
   */
  async createCommand(command: Partial<Command>): Promise<void> {
    try {
      const response = await this.api.post("/api/commands", command)
      if (response.data.result === ApiResult.ERROR) {
        throw new Error(response.data.message || "Failed to create command")
      }
    } catch (err: any) {
      throw new Error(`Failed to create command: ${err.message}`)
    }
  }

  /**
   * Update an existing bot command
   * @param command - The complete command object with updates
   * @returns Promise resolving when command update is complete
   * @throws Error if the API request fails or user is not authenticated
   */
  async updateCommand(command: Command): Promise<void> {
    try {
      const response = await this.api.patch(
        `/api/commands/${command._id}`,
        command
      )
      if (response.data.result === ApiResult.ERROR) {
        throw new Error(response.data.message || "Failed to update command")
      }
    } catch (err: any) {
      throw new Error(`Failed to update command: ${err.message}`)
    }
  }

  /**
   * Delete an existing bot command
   * @param command - The command object to delete
   * @returns Promise resolving when command deletion is complete
   * @throws Error if the API request fails or user is not authenticated
   */
  async deleteCommand(command: Command): Promise<void> {
    try {
      const response = await this.api.delete(`/api/commands/${command._id}`, {
        data: command,
      })
      if (response.data.result !== "success") {
        throw new Error(response.data.message || "Failed to delete command")
      }
      // Return void on success
    } catch (err: any) {
      throw new Error(`Failed to delete command: ${err.message}`)
    }
  }

  /**
   * Get list of channels configured for stream alerts
   * @returns Promise resolving to array of stream alert channels
   * @throws Error if the API request fails
   */
  async getStreamAlertsChannels(): Promise<StreamAlertsChannel[]> {
    try {
      const response = await this.api.get("/api/streamAlerts/channels")
      if (
        response.data.result === "success" &&
        response.data.data !== undefined
      ) {
        return response.data.data
      }
      throw new Error(
        response.data.message || "Failed to get stream alerts channels"
      )
    } catch (err: any) {
      throw new Error(`Failed to get stream alerts channels: ${err.message}`)
    }
  }

  /**
   * Add a Twitch channel to stream alerts monitoring
   * @param twitchUsername - The Twitch username to add to stream alerts
   * @returns Promise resolving when the channel is added
   * @throws Error if the API request fails or user is not authenticated
   */
  async addChannelToStreamAlerts(twitchUsername: string): Promise<void> {
    try {
      const response = await this.api.post("/api/streamAlerts/channels", {
        channels: [twitchUsername],
      })
      if (response.data.result !== "success") {
        throw new Error(
          response.data.message || "Failed to add channel to stream alerts"
        )
      }
      // Return void on success
    } catch (err: any) {
      throw new Error(`Failed to add channel to stream alerts: ${err.message}`)
    }
  }

  /**
   * Remove a Twitch channel from stream alerts monitoring
   * @param twitchUserId - The Twitch user ID to remove from stream alerts
   * @returns Promise resolving when the channel is removed
   * @throws Error if the API request fails or user is not authenticated
   */
  async removeChannelFromStreamAlerts(twitchUserId: string): Promise<void> {
    try {
      const response = await this.api.delete(
        `/api/streamAlerts/channels/${twitchUserId}`
      )
      if (response.data.result !== "success") {
        throw new Error(
          response.data.message || "Failed to remove channel from stream alerts"
        )
      }
      // Return void on success
    } catch (err: any) {
      throw new Error(
        `Failed to remove channel from stream alerts: ${err.message}`
      )
    }
  }

  /**
   * Get list of active Twitch channels from service configuration
   * @returns Promise resolving to array of active channels
   * @throws Error if the API request fails or service is not authenticated
   */
  async getActiveChannels(): Promise<ActiveChannel[]> {
    try {
      const response = await this.api.get("/api/configs/twitch/activeChannels")
      if (
        response.data.result === "success" &&
        response.data.data !== undefined
      ) {
        return response.data.data
      }
      throw new Error(response.data.message || "Failed to get active channels")
    } catch (err: any) {
      throw new Error(`Failed to get active channels: ${err.message}`)
    }
  }

  /**
   * Find a specific bot command by name
   * @param request - The command search request containing command name
   * @returns Promise resolving to the found command data (if any)
   * @throws Error if the API request fails or service is not authenticated
   */
  async findCommand(
    request: CommandFindRequest
  ): Promise<{ command?: Command }> {
    try {
      const response = await this.api.post("/api/commands/find", request)
      if (
        response.data.result === "success" &&
        response.data.data !== undefined
      ) {
        return response.data.data
      }
      throw new Error(response.data.message || "Failed to find command")
    } catch (err: any) {
      throw new Error(`Failed to find command: ${err.message}`)
    }
  }

  /**
   * Log usage of a bot command for analytics and monitoring
   * @param logData - The command usage log data including user, channel, and platform info
   * @returns Promise resolving when the log is recorded
   * @throws Error if the API request fails or service is not authenticated
   */
  async logCommandUsage(logData: CommandLogRequest): Promise<void> {
    try {
      const response = await this.api.post("/api/commands/logs", logData)
      if (response.data.result !== "success") {
        throw new Error(response.data.message || "Failed to log command usage")
      }
      // Return void on success
    } catch (err: any) {
      throw new Error(`Failed to log command usage: ${err.message}`)
    }
  }

  /**
   * Get a specific bot command by its unique ID
   * @param commandId - The unique identifier of the command to retrieve
   * @returns Promise resolving to the command data
   * @throws Error if the API request fails or command is not found
   */
  async getCommandById(commandId: string): Promise<Command> {
    try {
      const response = await this.api.get(`/api/commands/${commandId}`)
      if (
        response.data.result === "success" &&
        response.data.data !== undefined
      ) {
        return response.data.data
      }
      throw new Error(response.data.message || "Failed to get command by ID")
    } catch (err: any) {
      throw new Error(`Failed to get command by ID: ${err.message}`)
    }
  }

  /**
   * Delete a specific bot command by its unique ID
   * @param commandId - The unique identifier of the command to delete
   * @returns Promise resolving when command deletion is complete
   * @throws Error if the API request fails or command is not found
   */
  async deleteCommandById(commandId: string): Promise<void> {
    try {
      const response = await this.api.delete(`/api/commands/${commandId}`)
      if (response.data.result !== "success") {
        throw new Error(
          response.data.message || "Failed to delete command by ID"
        )
      }
      // Return void on success
    } catch (err: any) {
      throw new Error(`Failed to delete command by ID: ${err.message}`)
    }
  }

  /**
   * Create Discord guild configuration for a new server
   * @param guildConfig - The guild configuration data to create
   * @returns Promise resolving to the created guild config
   * @throws Error if the API request fails or service is not authenticated
   */
  async createGuildConfig(guildConfig: GuildConfig): Promise<GuildConfigData> {
    try {
      const response = await this.api.post("/api/discord/guild", guildConfig)
      if (
        response.data.result === "success" &&
        response.data.data !== undefined
      ) {
        return response.data.data
      }
      throw new Error(response.data.message || "Failed to create guild config")
    } catch (err: any) {
      throw new Error(`Failed to create guild config: ${err.message}`)
    }
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
    try {
      const response = await this.api.patch(
        `/api/discord/guild/${guildId}`,
        updates
      )
      if (
        response.data.result === "success" &&
        response.data.data !== undefined
      ) {
        return response.data.data
      }
      throw new Error(response.data.message || "Failed to update guild config")
    } catch (err: any) {
      throw new Error(`Failed to update guild config: ${err.message}`)
    }
  }

  // Practice list endpoints

  /**
   * Add an entry to a user's practice list
   * @param targetUser - The Twitch user ID whose practice list to modify
   * @param listName - The name of the practice list (e.g., "rooms")
   * @param entry - The entry text to add to the list
   * @returns Promise resolving when entry is added
   * @throws Error if the API request fails or service is not authenticated
   */
  async addPracticeListEntry(
    targetUser: string,
    listName: string,
    entry: string
  ): Promise<void> {
    try {
      const response = await this.api.post(
        `/api/prac/${targetUser}/lists/${listName}/entries`,
        { entry }
      )
      if (response.data.result !== "success") {
        throw new Error(
          response.data.message || "Failed to add practice list entry"
        )
      }
      // Return void on success
    } catch (err: any) {
      throw new Error(`Failed to add practice list entry: ${err.message}`)
    }
  }

  /**
   * Get all entries from a user's practice list
   * @param targetUser - The Twitch user ID whose practice list to retrieve
   * @param listName - The name of the practice list (e.g., "rooms")
   * @returns Promise resolving to practice list entries
   * @throws Error if the API request fails or practice list is not found
   */
  async getPracticeList(
    targetUser: string,
    listName: string
  ): Promise<{ entries: string[] }> {
    try {
      const response = await this.api.get(
        `/api/prac/${targetUser}/lists/${listName}`
      )
      if (
        response.data.result === "success" &&
        response.data.data !== undefined
      ) {
        return response.data.data
      }
      throw new Error(response.data.message || "Failed to get practice list")
    } catch (err: any) {
      throw new Error(`Failed to get practice list: ${err.message}`)
    }
  }

  /**
   * Delete a specific entry from a user's practice list by its index
   * @param targetUser - The Twitch user ID whose practice list to modify
   * @param listName - The name of the practice list (e.g., "rooms")
   * @param entryId - The 1-based index of the entry to delete
   * @returns Promise resolving when entry is deleted
   * @throws Error if the API request fails or entry is not found
   */
  async deletePracticeListEntry(
    targetUser: string,
    listName: string,
    entryId: number
  ): Promise<void> {
    try {
      const response = await this.api.delete(
        `/api/prac/${targetUser}/lists/${listName}/entries/${entryId}`
      )
      if (response.data.result !== "success") {
        throw new Error(
          response.data.message || "Failed to delete practice list entry"
        )
      }
      // Return void on success
    } catch (err: any) {
      throw new Error(`Failed to delete practice list entry: ${err.message}`)
    }
  }

  /**
   * Clear all entries from a user's practice list
   * @param targetUser - The Twitch user ID whose practice list to clear
   * @param listName - The name of the practice list (e.g., "rooms")
   * @returns Promise resolving when list is cleared
   * @throws Error if the API request fails or practice list is not found
   */
  async clearPracticeList(targetUser: string, listName: string): Promise<void> {
    try {
      const response = await this.api.delete(
        `/api/prac/${targetUser}/lists/${listName}`
      )
      if (response.data.result !== "success") {
        throw new Error(
          response.data.message || "Failed to clear practice list"
        )
      }
      // Return void on success
    } catch (err: any) {
      throw new Error(`Failed to clear practice list: ${err.message}`)
    }
  }
}

// Export all types for convenience
export * from "./types"
