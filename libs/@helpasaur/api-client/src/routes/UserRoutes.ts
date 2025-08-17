import { ApiBase } from "../base/ApiBase"
import { ApiUser } from "../types"

/**
 * API routes for user management
 * Handles current user information and authentication
 */
export class UserRoutes extends ApiBase {
  /**
   * Get current authenticated user information
   * @returns Promise resolving to current user data
   * @throws Error if the API request fails or user is not authenticated
   */
  async getCurrentUser(): Promise<ApiUser> {
    return this.apiGet("/api/me")
  }
}
