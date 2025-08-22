import {
  SlashCommandBuilder,
  ChannelType,
  inlineCode,
  ChatInputCommandInteraction,
  MessageFlags,
} from "discord.js"
import { DiscordCommand, ExtendedClient } from "../types"
import { GuildConfig } from "@helpasaur/types"

interface CommandConfig {
  typeFn: string
  key: string
  valueProperty?: string
  guildConfigKey: string
  valueOnNull?: unknown
}

const configCommand: DiscordCommand = {
  data: new SlashCommandBuilder()
    .setName("helpa-config")
    .setDescription("Configure bot settings")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("cooldown")
        .setDescription("Sets the cooldown to be used for commands")
        .addIntegerOption((option) =>
          option
            .setName("seconds")
            .setDescription("Number of seconds (must be at least 5)")
            .setRequired(true)
            .setMinValue(5)
            .setMaxValue(3600)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("prefix")
        .setDescription("Sets the prefix to be used for commands")
        .addStringOption((option) =>
          option
            .setName("character")
            .setDescription("Choose a character")
            .setRequired(true)
            .addChoices(
              { name: "!", value: "!" },
              { name: "$", value: "$" },
              { name: "%", value: "%" },
              { name: "^", value: "^" },
              { name: "&", value: "&" }
            )
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("stream-alerts")
        .setDescription("Enable/disable stream alerts")
        .addBooleanOption((option) =>
          option
            .setName("enable")
            .setDescription(
              "Be sure to set the stream-alerts-channel if you enable these!"
            )
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("stream-alerts-channel")
        .setDescription("Sets the channel to be used for stream alerts")
        .addChannelOption((option) =>
          option
            .setName("channel")
            .setDescription("The text channel to send stream alerts to")
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("weekly-one-hour-warning")
        .setDescription(
          "Enable/disable alert for one hour prior to the weekly race"
        )
        .addBooleanOption((option) =>
          option
            .setName("enable")
            .setDescription(
              "Be sure to set the weekly-alerts-channel if you enable this!"
            )
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("weekly-race-room-alert")
        .setDescription(
          "Enable/disable weekly race room creation notifications"
        )
        .addBooleanOption((option) =>
          option
            .setName("enable")
            .setDescription(
              "Be sure to set the weekly-alerts-channel if you enable this!"
            )
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("weekly-alerts-channel")
        .setDescription("Sets the channel to be used for weekly alerts")
        .addChannelOption((option) =>
          option
            .setName("channel")
            .setDescription("The text channel to send weekly alerts to")
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("weekly-alerts-role")
        .setDescription("Sets the role to be pinged for weekly alerts")
        .addRoleOption((option) =>
          option
            .setName("role")
            .setDescription(
              "The role to ping (or leave blank to not ping any role)"
            )
            .setRequired(false)
        )
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    // Defer reply while fetching current config
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] })

    const subcommand = interaction.options.getSubcommand()
    const { guildId, client } = interaction as ChatInputCommandInteraction & {
      client: ExtendedClient
    }

    // See if there's an internal configuration for this guild
    const currentGuildConfig = client.config.guilds.find(
      (g: GuildConfig) => g.id === guildId
    )
    if (!currentGuildConfig) {
      await interaction.editReply({
        content: "Unable to find a configuration for this guild!",
      })
      return
    }

    const subcommandMap = new Map<string, CommandConfig>([
      [
        "prefix",
        {
          typeFn: "getString",
          key: "character",
          guildConfigKey: "cmdPrefix",
        },
      ],
      [
        "cooldown",
        {
          typeFn: "getInteger",
          key: "seconds",
          guildConfigKey: "textCmdCooldown",
        },
      ],
      [
        "stream-alerts",
        {
          typeFn: "getBoolean",
          key: "enable",
          guildConfigKey: "enableStreamAlerts",
        },
      ],
      [
        "stream-alerts-channel",
        {
          typeFn: "getChannel",
          key: "channel",
          valueProperty: "id",
          guildConfigKey: "streamAlertsChannelId",
        },
      ],
      [
        "weekly-one-hour-warning",
        {
          typeFn: "getBoolean",
          key: "enable",
          guildConfigKey: "enableWeeklyRaceAlert",
        },
      ],
      [
        "weekly-race-room-alert",
        {
          typeFn: "getBoolean",
          key: "enable",
          guildConfigKey: "enableWeeklyRaceRoomAlert",
        },
      ],
      [
        "weekly-alerts-channel",
        {
          typeFn: "getChannel",
          key: "channel",
          valueProperty: "id",
          guildConfigKey: "weeklyRaceAlertChannelId",
        },
      ],
      [
        "weekly-alerts-role",
        {
          typeFn: "getRole",
          key: "role",
          valueProperty: "id",
          guildConfigKey: "weeklyRaceAlertRoleId",
          valueOnNull: null,
        },
      ],
    ])

    const guildUpdate: Partial<GuildConfig> = {}
    const commandConfig = subcommandMap.get(subcommand)
    if (!commandConfig) {
      await interaction.editReply({
        content: "That's not a valid subcommand!",
      })
      return
    }

    const { typeFn, key, guildConfigKey } = commandConfig
    let newValue: unknown = (
      interaction.options as unknown as Record<string, Function>
    )[typeFn](key)
    if (newValue === null && commandConfig.valueOnNull !== undefined) {
      newValue = commandConfig.valueOnNull
    }
    if (
      newValue !== null &&
      newValue !== undefined &&
      commandConfig.valueProperty
    ) {
      newValue = (newValue as Record<string, unknown>)[
        commandConfig.valueProperty
      ]
    }
    if (
      (currentGuildConfig as unknown as Record<string, unknown>)[
        guildConfigKey
      ] === newValue
    ) {
      await interaction.editReply({
        content: "That's already the value!",
      })
      return
    }

    ;(guildUpdate as Record<string, unknown>)[guildConfigKey] = newValue
    ;(currentGuildConfig as unknown as Record<string, unknown>)[
      guildConfigKey
    ] = newValue

    await this.helpaApi?.discord.updateGuildConfig(
      interaction.guildId!,
      guildUpdate
    )
    await interaction.editReply({
      content: `Updated ${inlineCode(subcommand)} to ${inlineCode(String(newValue))}!`,
    })
  },
}

module.exports = configCommand
