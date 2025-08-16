import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryOptions,
  UseMutationOptions,
} from "@tanstack/react-query"
import {
  HelpaApi,
  Command,
  ApiUser,
  WebConfig,
  TwitchStream,
  TwitchBotConfig,
  ConfigUpdatePayload,
  DiscordJoinUrl,
  TwitchBotChannelData,
  ApiResponse,
  StreamAlertsChannel,
} from "@helpasaur/api-client"
import { useToast } from "./useToast"

// Web-specific response types for React Query mutations
type MutationResponse = ApiResponse<{}>

/**
 * Helper function to extract data from ApiResponse<T> or throw an error
 * @param response - The API response to extract data from
 * @param operation - The operation name for error messages
 * @returns The extracted data
 * @throws Error if the response indicates failure or has no data
 */
function extractApiResponseData<T>(
  response: ApiResponse<T>,
  operation: string
): T {
  if (response.result === "success" && response.data !== undefined) {
    return response.data
  }
  throw new Error(response.message || `Failed to ${operation}`)
}

// Extended mutation options with toast control
interface MutationOptionsWithToast<TData, TError, TVariables>
  extends Omit<UseMutationOptions<TData, TError, TVariables>, "mutationFn"> {
  showToast?: boolean
}

if (!process.env.API_HOST) {
  throw new Error(
    "API_HOST environment variable is not defined. Please set it during build time."
  )
}

// Create API client for web app usage
const helpaApiClient = new HelpaApi({
  apiHost: process.env.API_HOST,
  serviceName: "web",
  webMode: true,
})

/**
 * Consolidated hook for all Helpa API queries and mutations
 * Provides consistent query patterns and centralized API client usage
 */
export const useHelpaApi = () => {
  const queryClient = useQueryClient()
  const toast = useToast()

  // Query hooks for read operations
  const queries = {
    /**
     * Get web configuration
     */
    useConfig: (
      options?: Omit<UseQueryOptions<WebConfig, Error>, "queryKey" | "queryFn">
    ) =>
      useQuery({
        queryKey: ["config"],
        queryFn: async () => {
          const response = await helpaApiClient.getWebConfig()
          return extractApiResponseData(response, "get config")
        },
        staleTime: 60 * 60 * 1000, // 1 hour
        ...options,
      }),

    /**
     * Get current user
     */
    useUser: (
      options?: Omit<UseQueryOptions<ApiUser, Error>, "queryKey" | "queryFn">
    ) =>
      useQuery({
        queryKey: ["user"],
        queryFn: async () => {
          const response = await helpaApiClient.getCurrentUser()
          return extractApiResponseData(response, "get user")
        },
        retry: 0,
        ...options,
      }),

    /**
     * Get all commands
     */
    useCommands: (
      options?: Omit<UseQueryOptions<Command[], Error>, "queryKey" | "queryFn">
    ) =>
      useQuery({
        queryKey: ["commands"],
        queryFn: async () => {
          const response = await helpaApiClient.getCommands()
          return extractApiResponseData(response, "get commands")
        },
        ...options,
      }),

    /**
     * Get live streams
     */
    useLivestreams: (
      options?: Omit<
        UseQueryOptions<TwitchStream[], Error>,
        "queryKey" | "queryFn"
      >
    ) =>
      useQuery({
        queryKey: ["livestreams"],
        queryFn: async () => {
          const response = await helpaApiClient.getLivestreams()
          return extractApiResponseData(response, "get livestreams")
        },
        refetchInterval: 1000 * 60, // 1 minute
        ...options,
      }),

    /**
     * Get Discord join URL
     */
    useDiscordJoinUrl: (
      options?: Omit<
        UseQueryOptions<DiscordJoinUrl, Error>,
        "queryKey" | "queryFn"
      >
    ) =>
      useQuery({
        queryKey: ["discordJoinUrl"],
        queryFn: async () => {
          const response = await helpaApiClient.getDiscordJoinUrl()
          return extractApiResponseData(response, "get Discord join URL")
        },
        ...options,
      }),

    /**
     * Get Twitch bot configuration
     */
    useTwitchBotConfig: (
      options?: Omit<
        UseQueryOptions<TwitchBotConfig, Error>,
        "queryKey" | "queryFn"
      >
    ) =>
      useQuery({
        queryKey: ["twitchBotConfig"],
        queryFn: async () => {
          const response = await helpaApiClient.getTwitchBotConfig()
          return extractApiResponseData(response, "get Twitch bot config")
        },
        retry: 0,
        ...options,
      }),

    /**
     * Get Twitch bot channels
     */
    useTwitchBotChannels: (
      options?: Omit<UseQueryOptions<string[], Error>, "queryKey" | "queryFn">
    ) =>
      useQuery({
        queryKey: ["twitchBotChannels"],
        queryFn: async () => {
          const response = await helpaApiClient.getTwitchBotChannels()
          return extractApiResponseData(response, "get Twitch bot channels")
        },
        ...options,
      }),

    /**
     * Get stream alerts channels
     */
    useStreamAlertsChannels: (
      options?: Omit<
        UseQueryOptions<StreamAlertsChannel[], Error>,
        "queryKey" | "queryFn"
      >
    ) =>
      useQuery({
        queryKey: ["streamAlertsChannels"],
        queryFn: async () => {
          const response = await helpaApiClient.getStreamAlertsChannels()
          return extractApiResponseData(response, "get stream alerts channels")
        },
        ...options,
      }),
  }

  // Mutation hooks for write operations
  const mutations = {
    /**
     * Update Twitch bot configuration
     */
    useUpdateTwitchBotConfig: (
      options?: MutationOptionsWithToast<
        MutationResponse,
        Error,
        ConfigUpdatePayload
      >
    ) => {
      const { showToast = true, ...mutationOptions } = options || {}
      return useMutation({
        mutationFn: (config: ConfigUpdatePayload) =>
          helpaApiClient.updateTwitchBotConfig(config),
        onSuccess: (data, variables, context) => {
          queryClient.invalidateQueries({ queryKey: ["twitchBotConfig"] })
          if (showToast) {
            toast.success("Twitch bot configuration updated!")
          }
          mutationOptions.onSuccess?.(data, variables, context)
        },
        onError: (error, variables, context) => {
          if (showToast) {
            toast.error(`Failed to update configuration: ${error.message}`)
          }
          mutationOptions.onError?.(error, variables, context)
        },
        ...mutationOptions,
      })
    },

    /**
     * Join Twitch channel
     */
    useJoinTwitchChannel: (
      options?: MutationOptionsWithToast<
        ApiResponse<TwitchBotChannelData>,
        Error,
        string | undefined
      >
    ) => {
      const { showToast = true, ...mutationOptions } = options || {}
      return useMutation({
        mutationFn: (twitchUsername?: string) =>
          helpaApiClient.joinTwitchChannel(twitchUsername),
        onSuccess: (data, variables, context) => {
          queryClient.invalidateQueries({ queryKey: ["twitchBotConfig"] })
          if (showToast && data.result === "success") {
            toast.success(
              data.message || `Joined channel: ${variables || "your channel"}`
            )
          } else if (showToast && data.result === "noop") {
            toast.info(data.message || "Already in channel")
          }
          mutationOptions.onSuccess?.(data, variables, context)
        },
        onError: (error, variables, context) => {
          if (showToast) {
            toast.error(`Failed to join channel: ${error.message}`)
          }
          mutationOptions.onError?.(error, variables, context)
        },
        ...mutationOptions,
      })
    },

    /**
     * Leave Twitch channel
     */
    useLeaveTwitchChannel: (
      options?: MutationOptionsWithToast<
        ApiResponse<TwitchBotChannelData>,
        Error,
        string | undefined
      >
    ) => {
      const { showToast = true, ...mutationOptions } = options || {}
      return useMutation({
        mutationFn: (twitchUsername?: string) =>
          helpaApiClient.leaveTwitchChannel(twitchUsername),
        onSuccess: (data, variables, context) => {
          queryClient.invalidateQueries({ queryKey: ["twitchBotConfig"] })
          if (showToast && data.result === "success") {
            toast.success(
              data.message || `Left channel: ${variables || "your channel"}`
            )
          } else if (showToast && data.result === "noop") {
            toast.info(data.message || "Not in channel")
          }
          mutationOptions.onSuccess?.(data, variables, context)
        },
        onError: (error, variables, context) => {
          if (showToast) {
            toast.error(`Failed to leave channel: ${error.message}`)
          }
          mutationOptions.onError?.(error, variables, context)
        },
        ...mutationOptions,
      })
    },

    /**
     * Create command
     */
    useCreateCommand: (
      options?: MutationOptionsWithToast<
        MutationResponse,
        Error,
        Partial<Command>
      >
    ) => {
      const { showToast = true, ...mutationOptions } = options || {}
      return useMutation({
        mutationFn: (command: Partial<Command>) =>
          helpaApiClient.createCommand(command),
        onSuccess: (data, variables, context) => {
          queryClient.invalidateQueries({ queryKey: ["commands"] })
          if (showToast) {
            toast.success(`Command '${variables.command}' created!`)
          }
          mutationOptions.onSuccess?.(data, variables, context)
        },
        onError: (error, variables, context) => {
          if (showToast) {
            toast.error(`Unable to create command: ${error.message}`)
          }
          mutationOptions.onError?.(error, variables, context)
        },
        ...mutationOptions,
      })
    },

    /**
     * Update command
     */
    useUpdateCommand: (
      options?: MutationOptionsWithToast<MutationResponse, Error, Command>
    ) => {
      const { showToast = true, ...mutationOptions } = options || {}
      return useMutation({
        mutationFn: (command: Command) => helpaApiClient.updateCommand(command),
        onSuccess: (data, variables, context) => {
          queryClient.invalidateQueries({ queryKey: ["commands"] })
          if (showToast) {
            toast.success(`Command '${variables.command}' updated!`)
          }
          mutationOptions.onSuccess?.(data, variables, context)
        },
        onError: (error, variables, context) => {
          if (showToast) {
            toast.error(`Unable to update command: ${error.message}`)
          }
          mutationOptions.onError?.(error, variables, context)
        },
        ...mutationOptions,
      })
    },

    /**
     * Delete command
     */
    useDeleteCommand: (
      options?: MutationOptionsWithToast<MutationResponse, Error, Command>
    ) => {
      const { showToast = true, ...mutationOptions } = options || {}
      return useMutation({
        mutationFn: (command: Command) => helpaApiClient.deleteCommand(command),
        onSuccess: (data, variables, context) => {
          queryClient.invalidateQueries({ queryKey: ["commands"] })
          if (showToast) {
            toast.success(`Command '${variables.command}' deleted!`)
          }
          mutationOptions.onSuccess?.(data, variables, context)
        },
        onError: (error, variables, context) => {
          if (showToast) {
            toast.error(`Unable to delete command: ${error.message}`)
          }
          mutationOptions.onError?.(error, variables, context)
        },
        ...mutationOptions,
      })
    },

    /**
     * Add channel to stream alerts
     */
    useAddChannelToStreamAlerts: (
      options?: MutationOptionsWithToast<MutationResponse, Error, string>
    ) => {
      const { showToast = true, ...mutationOptions } = options || {}
      return useMutation({
        mutationFn: (twitchUsername: string) =>
          helpaApiClient.addChannelToStreamAlerts(twitchUsername),
        onSuccess: (data, variables, context) => {
          queryClient.invalidateQueries({ queryKey: ["streamAlertsChannels"] })
          if (showToast) {
            toast.success(`Added ${variables} to stream alerts!`)
          }
          mutationOptions.onSuccess?.(data, variables, context)
        },
        onError: (error, variables, context) => {
          if (showToast) {
            toast.error(
              `Failed to add ${variables} to stream alerts: ${error.message}`
            )
          }
          mutationOptions.onError?.(error, variables, context)
        },
        ...mutationOptions,
      })
    },

    /**
     * Remove channel from stream alerts
     */
    useRemoveChannelFromStreamAlerts: (
      options?: MutationOptionsWithToast<MutationResponse, Error, string>
    ) => {
      const { showToast = true, ...mutationOptions } = options || {}
      return useMutation({
        mutationFn: (twitchUserId: string) =>
          helpaApiClient.removeChannelFromStreamAlerts(twitchUserId),
        onSuccess: (data, variables, context) => {
          queryClient.invalidateQueries({ queryKey: ["streamAlertsChannels"] })
          if (showToast) {
            toast.success(`Removed ${variables} from stream alerts!`)
          }
          mutationOptions.onSuccess?.(data, variables, context)
        },
        onError: (error, variables, context) => {
          if (showToast) {
            toast.error(
              `Failed to remove ${variables} from stream alerts: ${error.message}`
            )
          }
          mutationOptions.onError?.(error, variables, context)
        },
        ...mutationOptions,
      })
    },
  }

  return {
    ...queries,
    ...mutations,
    client: helpaApiClient, // Direct access to client if needed
  }
}
