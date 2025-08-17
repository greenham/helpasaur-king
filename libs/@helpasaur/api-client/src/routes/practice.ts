import { ApiBase } from "../base"

/**
 * API routes for practice list management
 * Handles user practice lists for speedrunning practice rooms and other lists
 */
export class PracticeRoutes extends ApiBase {
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
    return this.apiPost(`/api/prac/${targetUser}/lists/${listName}/entries`, {
      entry,
    })
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
    return this.apiGet(`/api/prac/${targetUser}/lists/${listName}`)
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
    return this.apiDelete(
      `/api/prac/${targetUser}/lists/${listName}/entries/${entryId}`
    )
  }

  /**
   * Clear all entries from a user's practice list
   * @param targetUser - The Twitch user ID whose practice list to clear
   * @param listName - The name of the practice list (e.g., "rooms")
   * @returns Promise resolving when list is cleared
   * @throws Error if the API request fails or practice list is not found
   */
  async clearPracticeList(targetUser: string, listName: string): Promise<void> {
    return this.apiDelete(`/api/prac/${targetUser}/lists/${listName}`)
  }
}
