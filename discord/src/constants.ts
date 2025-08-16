import { DiscordGuildConfig } from "./types/config"

export const defaultGuildConfig: DiscordGuildConfig = {
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
