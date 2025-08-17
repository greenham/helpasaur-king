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
    console.log(
      `[CommandCache] Cache miss or expired for '${commandName}', fetching from API`
    )
    try {
      const findCommandResult =
        await apiClient.commands.findCommand(commandName)

      if (findCommandResult) {
        resolvedCommand = {
          ...findCommandResult,
          staleAfter: Date.now() + cacheTimeoutMinutes * 60 * 1000,
        }
        cache.set(commandName, resolvedCommand)
        console.log(
          `[CommandCache] Cached '${commandName}' for ${cacheTimeoutMinutes} minutes`
        )
      } else {
        console.log(`[CommandCache] Command '${commandName}' not found`)
      }
    } catch (err) {
      console.error(
        `[CommandCache] Error while fetching command '${commandName}': ${err}`
      )
      return null
    }
  } else {
    console.log(`[CommandCache] Cache hit for '${commandName}'`)
    resolvedCommand = cachedCommand
  }

  return resolvedCommand
}
