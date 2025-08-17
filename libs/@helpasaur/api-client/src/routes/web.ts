import { ApiBase } from "../base"
import { WebConfig } from "../types"

/**
 * API routes for web application configuration
 * Handles web app specific settings and configuration
 */
export class WebRoutes extends ApiBase {
  /**
   * Get web configuration from the API
   * @returns Promise resolving to web app configuration
   * @throws Error if the API request fails
   */
  async getWebConfig(): Promise<WebConfig> {
    return this.apiGet("/api/web/config")
  }
}
