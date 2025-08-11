const { SlashCommandBuilder, ChannelType, inlineCode } = require("discord.js")

module.exports = {
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
          "Enable/disable message with a link to the weekly race room upon creation"
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
            .setDescription("The role to ping when sending alerts (optional)")
            .setRequired(false)
        )
    )
    .setDefaultMemberPermissions(0),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true })
    const currentGuildConfig = interaction.client.config.guilds.find(
      (g) => g.id === interaction.guildId
    )
    if (!currentGuildConfig) {
      await interaction.editReply({
        content: "This guild is not configured!",
        ephemeral: true,
      })
      return
    }

    const subcommand = interaction.options.getSubcommand()
    const subcommandMap = new Map([
      [
        "cooldown",
        {
          typeFn: "getInteger",
          key: "seconds",
          guildConfigKey: "textCmdCooldown",
        },
      ],
      [
        "prefix",
        { typeFn: "getString", key: "character", guildConfigKey: "cmdPrefix" },
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

    let guildUpdate = {}
    const commandConfig = subcommandMap.get(subcommand)
    if (!commandConfig) {
      await interaction.editReply({
        content: "That's not a valid subcommand!",
        ephemeral: true,
      })
      return
    }

    const { typeFn, key, guildConfigKey } = commandConfig
    let newValue = interaction.options[typeFn](key)
    if (newValue === null && commandConfig.valueOnNull !== undefined) {
      newValue = commandConfig.valueOnNull
    }
    if (newValue !== null && commandConfig.valueProperty) {
      newValue = newValue[commandConfig.valueProperty]
    }
    if (currentGuildConfig[guildConfigKey] === newValue) {
      await interaction.editReply({
        content: "That's already the value!",
        ephemeral: true,
      })
      return
    }

    guildUpdate[guildConfigKey] = newValue
    currentGuildConfig[guildConfigKey] = newValue

    await this.helpaApi.api.patch(
      `/api/discord/guild/${interaction.guildId}`,
      guildUpdate
    )
    await interaction.editReply({
      content: `Updated ${inlineCode(subcommand)} to ${inlineCode(newValue)}!`,
      ephemeral: true,
    })
  },
}
