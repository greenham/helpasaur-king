/**
 * Configuration types for API service
 */

import { GuildConfig } from "@helpasaur/types"

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

// Type guards
export function isDiscordConfig(
  config: unknown
): config is { config: DiscordServiceConfig } {
  return (
    typeof config === "object" &&
    config !== null &&
    "config" in config &&
    typeof (config as any).config === "object" &&
    "clientId" in (config as any).config
  )
}

export function isStreamAlertsConfig(
  config: unknown
): config is { config: StreamAlertsConfig } {
  return (
    typeof config === "object" &&
    config !== null &&
    "config" in config &&
    typeof (config as any).config === "object" &&
    "channels" in (config as any).config
  )
}
