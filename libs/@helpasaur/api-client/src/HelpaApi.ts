import axios, { AxiosInstance, AxiosError } from "axios"
import axiosRetry from "axios-retry"
import { ApiResult } from "@helpasaur/types"
import { ServiceConfigOptions, ServiceConfig, ServiceName } from "./types"
import { CommandRoutes } from "./routes/commands"
import { TwitchRoutes } from "./routes/twitch"
import { DiscordRoutes } from "./routes/discord"
import { StreamAlertsRoutes } from "./routes/stream-alerts"
import { PracticeRoutes } from "./routes/practice"
import { StreamRoutes } from "./routes/streams"
import { WebRoutes } from "./routes/web"
import { UserRoutes } from "./routes/user"

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

  // Route-specific API endpoints
  public readonly commands: CommandRoutes
  public readonly twitch: TwitchRoutes
  public readonly discord: DiscordRoutes
  public readonly streamAlerts: StreamAlertsRoutes
  public readonly practice: PracticeRoutes
  public readonly streams: StreamRoutes
  public readonly web: WebRoutes
  public readonly user: UserRoutes

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

    // Initialize route-specific API endpoints
    this.commands = new CommandRoutes(this.api)
    this.twitch = new TwitchRoutes(this.api)
    this.discord = new DiscordRoutes(this.api)
    this.streamAlerts = new StreamAlertsRoutes(this.api)
    this.practice = new PracticeRoutes(this.api)
    this.streams = new StreamRoutes(this.api)
    this.web = new WebRoutes(this.api)
    this.user = new UserRoutes(this.api)
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
      const response = await this.api.get(`${this.apiHost}/auth/service`, {
        headers: { Authorization: this.apiKey },
      })

      if (response.data.result === ApiResult.ERROR) {
        throw new Error(response.data.message || "Authorization failed")
      }

      if (
        response.data.result === ApiResult.SUCCESS &&
        response.data.data?.token
      ) {
        this.accessToken = response.data.data.token
        // Use JWT for all subsequent calls
        this.api.defaults.headers.common["Authorization"] =
          `Bearer ${this.accessToken}`
        console.log(`✅ Service authorized with API!`)
        return true
      }

      throw new Error(response.data.message || "Authorization failed")
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

      const response = await this.api.get(`/api/configs/${this.serviceName}`)

      if (response.data.result === ApiResult.ERROR) {
        throw new Error(response.data.message || "Failed to get service config")
      }

      if (response.data.result === ApiResult.SUCCESS && response.data.data) {
        return response.data.data
      }

      throw new Error(response.data.message || "Failed to get service config")
    } catch (err: any) {
      throw new Error(`🔴 Error fetching service config: ${err.message}`)
    }
  }

  // Backward compatibility methods - delegate to route classes

  // Commands
  async getCommands() {
    return this.commands.getCommands()
  }
  async createCommand(command: any) {
    return this.commands.createCommand(command)
  }
  async updateCommand(command: any) {
    return this.commands.updateCommand(command)
  }
  async deleteCommand(command: any) {
    return this.commands.deleteCommand(command)
  }
  async findCommand(request: any) {
    return this.commands.findCommand(request)
  }
  async logCommandUsage(logData: any) {
    return this.commands.logCommandUsage(logData)
  }
  async getCommandById(commandId: string) {
    return this.commands.getCommandById(commandId)
  }
  async deleteCommandById(commandId: string) {
    return this.commands.deleteCommandById(commandId)
  }

  // Twitch
  async getTwitchBotConfig() {
    return this.twitch.getTwitchBotConfig()
  }
  async updateTwitchBotConfig(config: any) {
    return this.twitch.updateTwitchBotConfig(config)
  }
  async joinTwitchChannel(username?: string) {
    return this.twitch.joinTwitchChannel(username)
  }
  async leaveTwitchChannel(username?: string) {
    return this.twitch.leaveTwitchChannel(username)
  }
  async getTwitchBotChannels() {
    return this.twitch.getTwitchBotChannels()
  }
  async getActiveChannels() {
    return this.twitch.getActiveChannels()
  }

  // Discord
  async getDiscordJoinUrl() {
    return this.discord.getDiscordJoinUrl()
  }
  async createGuildConfig(config: any) {
    return this.discord.createGuildConfig(config)
  }
  async updateGuildConfig(guildId: string, updates: any) {
    return this.discord.updateGuildConfig(guildId, updates)
  }

  // Stream Alerts
  async getStreamAlertsChannels() {
    return this.streamAlerts.getStreamAlertsChannels()
  }
  async addChannelToStreamAlerts(username: string) {
    return this.streamAlerts.addChannelToStreamAlerts(username)
  }
  async removeChannelFromStreamAlerts(userId: string) {
    return this.streamAlerts.removeChannelFromStreamAlerts(userId)
  }

  // Practice Lists
  async addPracticeListEntry(user: string, list: string, entry: string) {
    return this.practice.addPracticeListEntry(user, list, entry)
  }
  async getPracticeList(user: string, list: string) {
    return this.practice.getPracticeList(user, list)
  }
  async deletePracticeListEntry(user: string, list: string, entryId: number) {
    return this.practice.deletePracticeListEntry(user, list, entryId)
  }
  async clearPracticeList(user: string, list: string) {
    return this.practice.clearPracticeList(user, list)
  }

  // Streams
  async getLivestreams() {
    return this.streams.getLivestreams()
  }

  // Web
  async getWebConfig() {
    return this.web.getWebConfig()
  }

  // User
  async getCurrentUser() {
    return this.user.getCurrentUser()
  }
}
