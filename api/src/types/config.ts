/**
 * Configuration types for API service
 */

import { GuildConfig } from "@helpasaur/types"
import Config from "../models/config"

// Discord service configuration
export interface DiscordServiceConfig {
  clientId: string
  oauth: {
    permissions: string
    scopes: string[]
  }
  activities?: string[]
  guilds: GuildConfig[]
}

// Stream alerts configuration
export interface StreamAlertsConfig {
  blacklistedUsers: string[]
  channels: Array<{
    id: string
    login: string
    display_name: string
    profile_image_url?: string
  }>
  statusFilters?: string
  alttpGameIds?: string[]
}

// Web service configuration
export interface WebServiceConfig {
  streams: StreamAlertsConfig
  twitch: {
    commandPrefixes: string[]
  }
}

// Generic configuration document
export interface ConfigDocument {
  id: string
  config:
    | DiscordServiceConfig
    | StreamAlertsConfig
    | WebServiceConfig
    | Record<string, unknown>
}

// Config type mapping for type safety
export const ConfigTypes = {
  discord: "discord",
  streamAlerts: "streamAlerts",
  web: "web",
} as const

export type ConfigTypeKey = keyof typeof ConfigTypes

// Type mapping interface
export interface ConfigTypeMap {
  discord: DiscordServiceConfig
  streamAlerts: StreamAlertsConfig
  web: WebServiceConfig
}

// Generic type guard that just validates the document structure
export function isValidConfigDoc<K extends ConfigTypeKey>(
  configDoc: unknown
): configDoc is {
  config: ConfigTypeMap[K]
  markModified: (path: string) => void
  save: () => Promise<unknown>
} {
  if (
    typeof configDoc !== "object" ||
    configDoc === null ||
    !("config" in configDoc)
  ) {
    return false
  }

  const doc = configDoc as Record<string, unknown>
  return typeof doc.config === "object" && doc.config !== null
}

// Generic config fetcher that handles DB lookup, validation, and extraction
export async function getConfig<K extends ConfigTypeKey>(
  configId: K
): Promise<ConfigTypeMap[K] | null> {
  const configDoc = await Config.findOne({ id: configId })

  if (!isValidConfigDoc<K>(configDoc)) {
    return null
  }

  return configDoc.config as ConfigTypeMap[K]
}

// Document interface for config documents
interface ConfigDoc {
  markModified: (path: string) => void
  save: () => Promise<unknown>
}

// Get config with document for cases where we need to save changes
export async function getConfigWithDoc<K extends ConfigTypeKey>(
  configId: K
): Promise<{ config: ConfigTypeMap[K]; doc: ConfigDoc } | null> {
  const configDoc = await Config.findOne({ id: configId })

  if (!isValidConfigDoc<K>(configDoc)) {
    return null
  }

  return {
    config: configDoc.config as ConfigTypeMap[K],
    doc: configDoc,
  }
}

// Legacy type guards for backwards compatibility (can be removed once all usage is updated)
export function isDiscordConfig(
  config: unknown
): config is { config: DiscordServiceConfig } {
  return isValidConfigDoc<"discord">(config)
}

export function isStreamAlertsConfig(
  config: unknown
): config is { config: StreamAlertsConfig } {
  return isValidConfigDoc<"streamAlerts">(config)
}

export function isWebServiceConfig(
  config: unknown
): config is { config: WebServiceConfig } {
  return isValidConfigDoc<"web">(config)
}
