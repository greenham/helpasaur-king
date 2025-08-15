import axios, { AxiosInstance, AxiosError } from "axios"
import axiosRetry from "axios-retry"
import {
  ServiceConfigOptions,
  ServiceConfig,
  ServiceAuthResponse,
  ServiceName,
} from "./types"

/**
 * Helps services connect to the Helpa API.
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
   * Authorizes the service with the API.
   * @returns A promise that resolves to true if the service is authorized successfully, or false otherwise.
   */
  async authorizeService(): Promise<boolean> {
    // Skip authorization in web mode - user auth handled by cookies
    if (this.webMode) {
      return true
    }

    try {
      const result = await this.api.get<ServiceAuthResponse>(
        `${this.apiHost}/auth/service`,
        {
          headers: { Authorization: this.apiKey },
        }
      )
      console.log(`✅ Service authorized with API!`)
      const { token } = result.data
      this.accessToken = token
      // Use JWT for all subsequent calls
      this.api.defaults.headers.common["Authorization"] = `Bearer ${token}`
      return true
    } catch (err: any) {
      console.error(`🔴 Error authorizing service: ${err.message}`)
      return false
    }
  }

  /**
   * Retrieves the service configuration from the API.
   * If necessary, it authorizes the service before making the request.
   * @returns The service configuration object, or null if an error occurs.
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

      const response = await this.api.get<ServiceConfig>(
        `${this.apiHost}/api/configs/${this.serviceName}`
      )
      return response.data
    } catch (err: any) {
      throw new Error(`🔴 Error fetching service config: ${err.message}`)
    }
  }

  /**
   * Get the current access token
   */
  getAccessToken(): string | null {
    return this.accessToken
  }

  // Public endpoints (no authentication required)

  /**
   * Get all commands from the API
   */
  async getCommands(): Promise<any> {
    try {
      const response = await this.api.get("/api/commands")
      return response.data
    } catch (err: any) {
      throw new Error(`Failed to get commands: ${err.message}`)
    }
  }

  /**
   * Get live streams from the API
   */
  async getLivestreams(): Promise<any> {
    try {
      const response = await this.api.get("/api/streams/live")
      return response.data
    } catch (err: any) {
      throw new Error(`Failed to get livestreams: ${err.message}`)
    }
  }

  /**
   * Get web configuration from the API
   */
  async getWebConfig(): Promise<any> {
    try {
      const response = await this.api.get("/api/web/config")
      return response.data
    } catch (err: any) {
      throw new Error(`Failed to get web config: ${err.message}`)
    }
  }

  /**
   * Get Discord join URL from the API
   */
  async getDiscordJoinUrl(): Promise<any> {
    try {
      const response = await this.api.get("/api/discord/joinUrl")
      return response.data
    } catch (err: any) {
      throw new Error(`Failed to get Discord join URL: ${err.message}`)
    }
  }

  // User-authenticated endpoints (require cookies in web mode)

  /**
   * Get current user information
   */
  async getCurrentUser(): Promise<any> {
    try {
      const response = await this.api.get("/api/me")
      return response.data
    } catch (err: any) {
      throw new Error(`Failed to get current user: ${err.message}`)
    }
  }

  /**
   * Get Twitch bot configuration for current user
   */
  async getTwitchBotConfig(): Promise<any> {
    try {
      const response = await this.api.get("/api/me/twitch")
      return response.data
    } catch (err: any) {
      throw new Error(`Failed to get Twitch bot config: ${err.message}`)
    }
  }

  /**
   * Update Twitch bot configuration for current user
   */
  async updateTwitchBotConfig(config: any): Promise<any> {
    try {
      const response = await this.api.patch("/api/twitch/config", config)
      return response.data
    } catch (err: any) {
      throw new Error(`Failed to update Twitch bot config: ${err.message}`)
    }
  }

  /**
   * Join Twitch channel
   */
  async joinTwitchChannel(twitchUsername?: string): Promise<any> {
    try {
      const body = twitchUsername ? { channel: twitchUsername } : {}
      const response = await this.api.post("/api/twitch/join", body)
      return response.data
    } catch (err: any) {
      throw new Error(`Failed to join Twitch channel: ${err.message}`)
    }
  }

  /**
   * Leave Twitch channel
   */
  async leaveTwitchChannel(twitchUsername?: string): Promise<any> {
    try {
      const body = twitchUsername ? { channel: twitchUsername } : {}
      const response = await this.api.post("/api/twitch/leave", body)
      return response.data
    } catch (err: any) {
      throw new Error(`Failed to leave Twitch channel: ${err.message}`)
    }
  }

  /**
   * Get Twitch bot channels
   */
  async getTwitchBotChannels(): Promise<any> {
    try {
      const response = await this.api.get("/api/twitch/channels")
      return response.data
    } catch (err: any) {
      throw new Error(`Failed to get Twitch bot channels: ${err.message}`)
    }
  }

  /**
   * Create a new command
   */
  async createCommand(command: any): Promise<any> {
    try {
      const response = await this.api.post("/api/commands", command)
      return response.data
    } catch (err: any) {
      throw new Error(`Failed to create command: ${err.message}`)
    }
  }

  /**
   * Update an existing command
   */
  async updateCommand(command: any): Promise<any> {
    try {
      const response = await this.api.patch(
        `/api/commands/${command._id}`,
        command
      )
      return response.data
    } catch (err: any) {
      throw new Error(`Failed to update command: ${err.message}`)
    }
  }

  /**
   * Delete a command
   */
  async deleteCommand(command: any): Promise<any> {
    try {
      const response = await this.api.delete(`/api/commands/${command._id}`, {
        data: command,
      })
      return response.data
    } catch (err: any) {
      throw new Error(`Failed to delete command: ${err.message}`)
    }
  }

  /**
   * Get stream alerts channels
   */
  async getStreamAlertsChannels(): Promise<any> {
    try {
      const response = await this.api.get("/api/streamAlerts/channels")
      return response.data
    } catch (err: any) {
      throw new Error(`Failed to get stream alerts channels: ${err.message}`)
    }
  }

  /**
   * Add channel to stream alerts
   */
  async addChannelToStreamAlerts(twitchUsername: string): Promise<any> {
    try {
      const response = await this.api.post("/api/streamAlerts/channels", {
        channels: [twitchUsername],
      })
      return response.data
    } catch (err: any) {
      throw new Error(`Failed to add channel to stream alerts: ${err.message}`)
    }
  }

  /**
   * Remove channel from stream alerts
   */
  async removeChannelFromStreamAlerts(twitchUserId: string): Promise<any> {
    try {
      const response = await this.api.delete(
        `/api/streamAlerts/channels/${twitchUserId}`
      )
      return response.data
    } catch (err: any) {
      throw new Error(
        `Failed to remove channel from stream alerts: ${err.message}`
      )
    }
  }
}

// Export all types for convenience
export * from "./types"
