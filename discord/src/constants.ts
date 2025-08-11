interface GuildConfig {
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

export const defaultGuildConfig: GuildConfig = {
  active: true,
  cmdPrefix: "!",
  textCmdCooldown: 10,
  enableStreamAlerts: false,
  streamAlertsChannelId: null,
  enableWeeklyRaceAlert: false,
  enableWeeklyRaceRoomAlert: false,
  weeklyRaceAlertChannelId: null,
  weeklyRaceAlertRoleId: null,
}