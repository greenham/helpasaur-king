import axios, { AxiosInstance, AxiosError } from "axios"
import axiosRetry from "axios-retry"
import { ApiResult, ServiceConfig } from "@helpasaur/types"
import { ClientOptions, ServiceName } from "./types/services"
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
  constructor(options: ClientOptions) {
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
}
