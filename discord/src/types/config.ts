import { GuildConfig } from "@helpasaur/types"

// Discord Bot Configuration
export interface DiscordConfig {
  token: string
  clientId: string
  guildId?: string
  activities?: string[]
  guilds: GuildConfig[]
  oauth?: {
    permissions: string
    scopes: string[]
  }
  channels?: {
    streamAlerts?: string
    raceAlerts?: string
    general?: string
  }
}

// Guild-specific configuration
export interface DiscordGuildConfig {
  active: boolean
  cmdPrefix: string
  textCmdCooldown: number
  enableStreamAlerts: boolean
  streamAlertsChannelId: string | null
  enableWeeklyRaceAlert: boolean
  enableWeeklyRaceRoomAlert: boolean
  weeklyRaceAlertChannelId: string | null
  weeklyRaceAlertRoleId: string | null
}
