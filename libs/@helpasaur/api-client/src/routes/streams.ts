import { ApiBase } from "../base"
import { TwitchStream } from "@helpasaur/types"

/**
 * API routes for stream management
 * Handles live stream data and monitoring
 */
export class StreamRoutes extends ApiBase {
  /**
   * Get live streams from the API
   * @returns Promise resolving to array of live Twitch streams
   * @throws Error if the API request fails
   */
  async getLivestreams(): Promise<TwitchStream[]> {
    return this.apiGet("/api/streams/live")
  }
}
