import { Command, HelpaApi } from "@helpasaur/api-client"

export type CachableCommand = Command & { staleAfter: number }

/**
 * Retrieves a command from cache or fetches fresh from API
 * Handles caching logic, expiration, and error handling
 * @param commandName - The command name to look up
 * @param cache - The cache Map to store/retrieve commands
 * @param apiClient - The API client to fetch fresh commands
 * @param cacheTimeoutMinutes - How long to cache commands (in minutes)
 * @returns Promise resolving to a cachable command or null
 */
export async function getCachedCommand(
  commandName: string,
  cache: Map<string, CachableCommand>,
  apiClient: HelpaApi,
  cacheTimeoutMinutes: number = 10
): Promise<CachableCommand | null> {
  let resolvedCommand: CachableCommand | null = null

  const cachedCommand = cache.get(commandName)
  if (
    !cachedCommand ||
    (cachedCommand && Date.now() > cachedCommand.staleAfter)
  ) {
    try {
      const findCommandResult =
        await apiClient.commands.findCommand(commandName)

      if (findCommandResult) {
        resolvedCommand = {
          ...findCommandResult,
          staleAfter: Date.now() + cacheTimeoutMinutes * 60 * 1000,
        }
        cache.set(commandName, resolvedCommand)
      }
    } catch (err) {
      console.error(`Error while fetching command: ${err}`)
      return null
    }
  } else {
    resolvedCommand = cachedCommand
  }

  return resolvedCommand
}
