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
  DiscordJoinUrlResponse,
  TwitchBotConfig,
  ConfigUpdatePayload,
  MutationResponse,
  TwitchBotChannelResponse,
  StreamAlertsChannel,
} from "@helpasaur/api-client"
import { useToast } from "./useToast"

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
        queryFn: () => helpaApiClient.getWebConfig(),
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
        queryFn: () => helpaApiClient.getCurrentUser(),
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
        queryFn: () => helpaApiClient.getCommands(),
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
        queryFn: () => helpaApiClient.getLivestreams(),
        refetchInterval: 1000 * 60, // 1 minute
        ...options,
      }),

    /**
     * Get Discord join URL
     */
    useDiscordJoinUrl: (
      options?: Omit<
        UseQueryOptions<DiscordJoinUrlResponse, Error>,
        "queryKey" | "queryFn"
      >
    ) =>
      useQuery({
        queryKey: ["discordJoinUrl"],
        queryFn: () => helpaApiClient.getDiscordJoinUrl(),
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
        queryFn: () => helpaApiClient.getTwitchBotConfig(),
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
        queryFn: () => helpaApiClient.getTwitchBotChannels(),
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
        queryFn: () => helpaApiClient.getStreamAlertsChannels(),
        ...options,
      }),
  }

  // Mutation hooks for write operations
  const mutations = {
    /**
     * Update Twitch bot configuration
     */
    useUpdateTwitchBotConfig: (
      options?: Omit<
        UseMutationOptions<MutationResponse, Error, ConfigUpdatePayload>,
        "mutationFn"
      >
    ) =>
      useMutation({
        mutationFn: (config: ConfigUpdatePayload) =>
          helpaApiClient.updateTwitchBotConfig(config),
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["twitchBotConfig"] })
        },
        ...options,
      }),

    /**
     * Join Twitch channel
     */
    useJoinTwitchChannel: (
      options?: Omit<
        UseMutationOptions<TwitchBotChannelResponse, Error, string | undefined>,
        "mutationFn"
      >
    ) =>
      useMutation({
        mutationFn: (twitchUsername?: string) =>
          helpaApiClient.joinTwitchChannel(twitchUsername),
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["twitchBotConfig"] })
        },
        ...options,
      }),

    /**
     * Leave Twitch channel
     */
    useLeaveTwitchChannel: (
      options?: Omit<
        UseMutationOptions<TwitchBotChannelResponse, Error, string | undefined>,
        "mutationFn"
      >
    ) =>
      useMutation({
        mutationFn: (twitchUsername?: string) =>
          helpaApiClient.leaveTwitchChannel(twitchUsername),
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["twitchBotConfig"] })
        },
        ...options,
      }),

    /**
     * Create command
     */
    useCreateCommand: (
      options?: Omit<
        UseMutationOptions<MutationResponse, Error, Partial<Command>>,
        "mutationFn"
      >
    ) =>
      useMutation({
        mutationFn: (command: Partial<Command>) =>
          helpaApiClient.createCommand(command),
        onSuccess: (_data, variables) => {
          toast.success(`Command '${variables.command}' created!`)
          queryClient.invalidateQueries({ queryKey: ["commands"] })
        },
        onError: (err: Error) => {
          toast.error(`Unable to create command: ${err.message}`)
        },
        ...options,
      }),

    /**
     * Update command
     */
    useUpdateCommand: (
      options?: Omit<
        UseMutationOptions<MutationResponse, Error, Command>,
        "mutationFn"
      >
    ) =>
      useMutation({
        mutationFn: (command: Command) => helpaApiClient.updateCommand(command),
        onSuccess: (_data, variables) => {
          toast.success(`Command '${variables.command}' updated!`)
          queryClient.invalidateQueries({ queryKey: ["commands"] })
        },
        onError: (err: Error) => {
          toast.error(`Unable to update command: ${err.message}`)
        },
        ...options,
      }),

    /**
     * Delete command
     */
    useDeleteCommand: (
      options?: Omit<
        UseMutationOptions<MutationResponse, Error, Command>,
        "mutationFn"
      >
    ) =>
      useMutation({
        mutationFn: (command: Command) => helpaApiClient.deleteCommand(command),
        onSuccess: (_data, variables) => {
          toast.success(`Command '${variables.command}' deleted!`)
          queryClient.invalidateQueries({ queryKey: ["commands"] })
        },
        onError: (err: Error) => {
          toast.error(`Unable to delete command: ${err.message}`)
        },
        ...options,
      }),

    /**
     * Add channel to stream alerts
     */
    useAddChannelToStreamAlerts: (
      options?: Omit<
        UseMutationOptions<MutationResponse, Error, string>,
        "mutationFn"
      >
    ) =>
      useMutation({
        mutationFn: (twitchUsername: string) =>
          helpaApiClient.addChannelToStreamAlerts(twitchUsername),
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["streamAlertsChannels"] })
        },
        ...options,
      }),

    /**
     * Remove channel from stream alerts
     */
    useRemoveChannelFromStreamAlerts: (
      options?: Omit<
        UseMutationOptions<MutationResponse, Error, string>,
        "mutationFn"
      >
    ) =>
      useMutation({
        mutationFn: (twitchUserId: string) =>
          helpaApiClient.removeChannelFromStreamAlerts(twitchUserId),
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["streamAlertsChannels"] })
        },
        ...options,
      }),
  }

  return {
    ...queries,
    ...mutations,
    client: helpaApiClient, // Direct access to client if needed
  }
}
