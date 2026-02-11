import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryOptions,
  UseMutationOptions,
} from "@tanstack/react-query"
import { HelpaApi } from "@helpasaur/api-client"
import {
  Command,
  ApiUser,
  WebConfig,
  TwitchStream,
  TwitchBotConfig,
  ConfigUpdatePayload,
  DiscordJoinUrl,
  StreamAlertsChannel,
  EventSubSubscription,
  TestEventPayload,
  CommandStatsOverview,
  TopCommand,
  PlatformBreakdown,
  TopUser,
  CommandTimeline,
  RecentCommandsResponse,
  TopChannel,
} from "@helpasaur/types"
import { useToast } from "./useToast"

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
        queryFn: () => helpaApiClient.web.getWebConfig(),
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
        queryFn: () => helpaApiClient.me.getCurrentUser(),
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
        queryFn: () => helpaApiClient.commands.getCommands(),
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
        queryFn: () => helpaApiClient.streams.getLivestreams(),
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
        queryFn: () => helpaApiClient.discord.getDiscordJoinUrl(),
        ...options,
      }),

    /**
     * Get user's Twitch bot configuration
     */
    useTwitchBotConfig: (
      options?: Omit<
        UseQueryOptions<TwitchBotConfig, Error>,
        "queryKey" | "queryFn"
      >
    ) =>
      useQuery({
        queryKey: ["twitchBotConfig"],
        queryFn: () => helpaApiClient.me.getTwitchBotConfig(),
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
        queryFn: () => helpaApiClient.twitch.getTwitchBotChannels(),
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
        queryFn: () => helpaApiClient.streamAlerts.getStreamAlertsChannels(),
        ...options,
      }),

    /**
     * Get EventSub subscriptions
     */
    useEventSubSubscriptions: (
      options?: Omit<
        UseQueryOptions<EventSubSubscription[], Error>,
        "queryKey" | "queryFn"
      >
    ) =>
      useQuery({
        queryKey: ["eventSubSubscriptions"],
        queryFn: () => helpaApiClient.streamAlerts.getEventSubSubscriptions(),
        enabled: false, // No auto-refetch, manual only
        ...options,
      }),

    /**
     * Get command statistics overview
     */
    useCommandStatsOverview: (
      timeRange?: string,
      options?: Omit<
        UseQueryOptions<CommandStatsOverview, Error>,
        "queryKey" | "queryFn"
      >
    ) =>
      useQuery({
        queryKey: ["commandStatsOverview", timeRange],
        queryFn: () =>
          helpaApiClient.commands.getCommandStatsOverview(timeRange),
        ...options,
      }),

    /**
     * Get top commands by usage
     */
    useTopCommands: (
      limit?: number,
      timeRange?: string,
      options?: Omit<
        UseQueryOptions<TopCommand[], Error>,
        "queryKey" | "queryFn"
      >
    ) =>
      useQuery({
        queryKey: ["topCommands", limit, timeRange],
        queryFn: () => helpaApiClient.commands.getTopCommands(limit, timeRange),
        ...options,
      }),

    /**
     * Get platform breakdown statistics
     */
    usePlatformBreakdown: (
      timeRange?: string,
      options?: Omit<
        UseQueryOptions<PlatformBreakdown[], Error>,
        "queryKey" | "queryFn"
      >
    ) =>
      useQuery({
        queryKey: ["platformBreakdown", timeRange],
        queryFn: () => helpaApiClient.commands.getPlatformBreakdown(timeRange),
        ...options,
      }),

    /**
     * Get top users by command usage
     */
    useTopUsers: (
      limit?: number,
      timeRange?: string,
      options?: Omit<UseQueryOptions<TopUser[], Error>, "queryKey" | "queryFn">
    ) =>
      useQuery({
        queryKey: ["topUsers", limit, timeRange],
        queryFn: () => helpaApiClient.commands.getTopUsers(limit, timeRange),
        ...options,
      }),

    /**
     * Get command usage timeline
     */
    useCommandTimeline: (
      timeRange?: string,
      interval?: string,
      options?: Omit<
        UseQueryOptions<CommandTimeline[], Error>,
        "queryKey" | "queryFn"
      >
    ) =>
      useQuery({
        queryKey: ["commandTimeline", timeRange, interval],
        queryFn: () =>
          helpaApiClient.commands.getCommandTimeline(timeRange, interval),
        ...options,
      }),

    /**
     * Get recent command logs
     */
    useRecentCommands: (
      page?: number,
      limit?: number,
      options?: Omit<
        UseQueryOptions<RecentCommandsResponse, Error>,
        "queryKey" | "queryFn"
      >
    ) =>
      useQuery({
        queryKey: ["recentCommands", page, limit],
        queryFn: () => helpaApiClient.commands.getRecentCommands(page, limit),
        ...options,
      }),

    /**
     * Get top channels/guilds by command usage
     */
    useTopChannels: (
      limit?: number,
      timeRange?: string,
      platform?: string,
      options?: Omit<
        UseQueryOptions<TopChannel[], Error>,
        "queryKey" | "queryFn"
      >
    ) =>
      useQuery({
        queryKey: ["topChannels", limit, timeRange, platform],
        queryFn: () =>
          helpaApiClient.commands.getTopChannels(limit, timeRange, platform),
        ...options,
      }),

    /**
     * Get all unique tags currently in use
     */
    useTags: (
      options?: Omit<UseQueryOptions<string[], Error>, "queryKey" | "queryFn">
    ) =>
      useQuery({
        queryKey: ["tags"],
        queryFn: () => helpaApiClient.commands.getTags(),
        ...options,
      }),

    /**
     * Get tag usage statistics
     */
    useTagStats: (
      options?: Omit<
        UseQueryOptions<Array<{ tag: string; count: number }>, Error>,
        "queryKey" | "queryFn"
      >
    ) =>
      useQuery({
        queryKey: ["tagStats"],
        queryFn: () => helpaApiClient.commands.getTagStats(),
        ...options,
      }),

    /**
     * Get count of untagged commands
     */
    useUntaggedCount: (
      options?: Omit<UseQueryOptions<number, Error>, "queryKey" | "queryFn">
    ) =>
      useQuery({
        queryKey: ["untaggedCount"],
        queryFn: () => helpaApiClient.commands.getUntaggedCount(),
        ...options,
      }),
  }

  // Mutation hooks for write operations
  const mutations = {
    /**
     * Update Twitch bot configuration
     */
    useUpdateTwitchBotConfig: (
      options?: MutationOptionsWithToast<void, Error, ConfigUpdatePayload>
    ) => {
      const { showToast = true, ...mutationOptions } = options || {}
      return useMutation({
        mutationFn: (config: ConfigUpdatePayload) =>
          helpaApiClient.twitch.updateTwitchBotConfig(config),
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
      options?: MutationOptionsWithToast<void, Error, string | undefined>
    ) => {
      const { showToast = true, ...mutationOptions } = options || {}
      return useMutation({
        mutationFn: (twitchUsername: string | undefined) =>
          helpaApiClient.twitch.joinTwitchChannel(twitchUsername),
        onSuccess: (data, variables, context) => {
          queryClient.invalidateQueries({ queryKey: ["twitchBotChannels"] })
          queryClient.invalidateQueries({ queryKey: ["twitchBotConfig"] })
          if (showToast) {
            toast.success(`Joined ${variables || "your channel"}!`)
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
      options?: MutationOptionsWithToast<void, Error, string | undefined>
    ) => {
      const { showToast = true, ...mutationOptions } = options || {}
      return useMutation({
        mutationFn: (twitchUsername: string | undefined) =>
          helpaApiClient.twitch.leaveTwitchChannel(twitchUsername),
        onSuccess: (data, variables, context) => {
          queryClient.invalidateQueries({ queryKey: ["twitchBotChannels"] })
          queryClient.invalidateQueries({ queryKey: ["twitchBotConfig"] })
          if (showToast) {
            toast.success(`Left ${variables || "your channel"}!`)
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
      options?: MutationOptionsWithToast<void, Error, Partial<Command>>
    ) => {
      const { showToast = true, ...mutationOptions } = options || {}
      return useMutation({
        mutationFn: (command: Partial<Command>) =>
          helpaApiClient.commands.createCommand(command),
        onSuccess: (data, variables, context) => {
          queryClient.invalidateQueries({ queryKey: ["commands"] })
          queryClient.invalidateQueries({ queryKey: ["tagStats"] })
          queryClient.invalidateQueries({ queryKey: ["untaggedCount"] })
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
      options?: MutationOptionsWithToast<
        void,
        Error,
        Partial<Command> & { _id: string }
      >
    ) => {
      const { showToast = true, ...mutationOptions } = options || {}
      return useMutation({
        mutationFn: (command: Partial<Command> & { _id: string }) =>
          helpaApiClient.commands.updateCommand(command),
        onSuccess: (data, variables, context) => {
          queryClient.invalidateQueries({ queryKey: ["commands"] })
          queryClient.invalidateQueries({ queryKey: ["tagStats"] })
          queryClient.invalidateQueries({ queryKey: ["untaggedCount"] })
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
      options?: MutationOptionsWithToast<void, Error, Command>
    ) => {
      const { showToast = true, ...mutationOptions } = options || {}
      return useMutation({
        mutationFn: (command: Command) =>
          helpaApiClient.commands.deleteCommand(command),
        onSuccess: (data, variables, context) => {
          queryClient.invalidateQueries({ queryKey: ["commands"] })
          queryClient.invalidateQueries({ queryKey: ["tagStats"] })
          queryClient.invalidateQueries({ queryKey: ["untaggedCount"] })
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
      options?: MutationOptionsWithToast<void, Error, string>
    ) => {
      const { showToast = true, ...mutationOptions } = options || {}
      return useMutation({
        mutationFn: (twitchUsername: string) =>
          helpaApiClient.streamAlerts.addChannelToStreamAlerts(twitchUsername),
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
      options?: MutationOptionsWithToast<void, Error, string>
    ) => {
      const { showToast = true, ...mutationOptions } = options || {}
      return useMutation({
        mutationFn: (twitchUserId: string) =>
          helpaApiClient.streamAlerts.removeChannelFromStreamAlerts(
            twitchUserId
          ),
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

    /**
     * Clear all EventSub subscriptions
     */
    useClearAllSubscriptions: (
      options?: MutationOptionsWithToast<void, Error, void>
    ) => {
      const { showToast = true, ...mutationOptions } = options || {}
      return useMutation({
        mutationFn: () =>
          helpaApiClient.streamAlerts.clearAllSubscriptions(),
        onSuccess: (data, variables, context) => {
          queryClient.invalidateQueries({
            queryKey: ["eventSubSubscriptions"],
          })
          if (showToast) {
            toast.success("All subscriptions cleared!")
          }
          mutationOptions.onSuccess?.(data, variables, context)
        },
        onError: (error, variables, context) => {
          if (showToast) {
            toast.error(
              `Failed to clear subscriptions: ${error.message}`
            )
          }
          mutationOptions.onError?.(error, variables, context)
        },
        ...mutationOptions,
      })
    },

    /**
     * Re-subscribe all currently watched channels
     */
    useResubscribeAllChannels: (
      options?: MutationOptionsWithToast<unknown, Error, void>
    ) => {
      const { showToast = true, ...mutationOptions } = options || {}
      return useMutation({
        mutationFn: () =>
          helpaApiClient.streamAlerts.resubscribeAllChannels(),
        onSuccess: (data, variables, context) => {
          queryClient.invalidateQueries({
            queryKey: ["eventSubSubscriptions"],
          })
          if (showToast) {
            toast.success("Re-subscribed all channels!")
          }
          mutationOptions.onSuccess?.(data, variables, context)
        },
        onError: (error, variables, context) => {
          if (showToast) {
            toast.error(
              `Failed to re-subscribe channels: ${error.message}`
            )
          }
          mutationOptions.onError?.(error, variables, context)
        },
        ...mutationOptions,
      })
    },

    /**
     * Trigger a test event
     */
    useTriggerTestEvent: (
      options?: MutationOptionsWithToast<void, Error, TestEventPayload>
    ) => {
      const { showToast = true, ...mutationOptions } = options || {}
      return useMutation({
        mutationFn: (payload: TestEventPayload) =>
          helpaApiClient.testEvents.triggerTestEvent(payload),
        onSuccess: (data, variables, context) => {
          if (showToast) {
            toast.success(
              `Test event triggered! Check Discord/Twitch for reactions.`
            )
          }
          mutationOptions.onSuccess?.(data, variables, context)
        },
        onError: (error, variables, context) => {
          if (showToast) {
            toast.error(`Failed to trigger test event: ${error.message}`)
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
