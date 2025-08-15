import { HelpaApi } from "@helpasaur/api-client"
import { Command } from "../types/commands"

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

export const getCommands = async () => {
  return await helpaApiClient.getCommands()
}

export const getLivestreams = async () => {
  return await helpaApiClient.getLivestreams()
}

export const getConfig = async () => {
  return await helpaApiClient.getWebConfig()
}

export const getDiscordJoinUrl = async () => {
  return await helpaApiClient.getDiscordJoinUrl()
}

export const getCurrentUser = async () => {
  return await helpaApiClient.getCurrentUser()
}

export const getTwitchBotConfig = async () => {
  return await helpaApiClient.getTwitchBotConfig()
}

export const getTwitchBotChannels = async () => {
  return await helpaApiClient.getTwitchBotChannels()
}

export const joinTwitchChannel = async (twitchUsername?: string) => {
  return await helpaApiClient.joinTwitchChannel(twitchUsername)
}

export const leaveTwitchChannel = async (twitchUsername?: string) => {
  return await helpaApiClient.leaveTwitchChannel(twitchUsername)
}

export const updateTwitchBotConfig = async (
  config: Partial<{
    practiceListsEnabled: boolean
    allowModsToManagePracticeLists: boolean
    commandsEnabled: boolean
    commandPrefix: string
    textCommandCooldown: number
    weeklyRaceAlertEnabled: boolean
  }>
) => {
  return await helpaApiClient.updateTwitchBotConfig(config)
}

export const createCommand = async (command: Command) => {
  return await helpaApiClient.createCommand(command)
}

export const updateCommand = async (command: Command) => {
  return await helpaApiClient.updateCommand(command)
}

export const deleteCommand = async (command: Command) => {
  return await helpaApiClient.deleteCommand(command)
}

export const getStreamAlertsChannels = async () => {
  return await helpaApiClient.getStreamAlertsChannels()
}

export const addChannelToStreamAlerts = async (twitchUsername: string) => {
  return await helpaApiClient.addChannelToStreamAlerts(twitchUsername)
}

export const removeChannelFromStreamAlerts = async (twitchUserId: string) => {
  return await helpaApiClient.removeChannelFromStreamAlerts(twitchUserId)
}
