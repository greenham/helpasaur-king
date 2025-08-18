import { ApiBase } from "../base"
import { ApiUser } from "@helpasaur/types"
import { ROUTES } from "../constants"

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
    return this.apiGet(ROUTES.ME)
  }
}
