const { SlashCommandBuilder, ChannelType } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("helpa-weekly")
    .setDescription("Manage weekly race alerts")
    .addBooleanOption((option) =>
      option
        .setName("one-hour-warning")
        .setDescription("Sends a reminder 1 hour before the race starts")
        .setRequired(true)
    )
    .addBooleanOption((option) =>
      option
        .setName("race-room-alert")
        .setDescription("Sends a link to the race room once it's created")
        .setRequired(true)
    )
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("The text channel to send the alerts to")
        .setRequired(false)
        .addChannelTypes(ChannelType.GuildText)
    )
    .addRoleOption((option) =>
      option
        .setName("role-to-ping")
        .setDescription("The role to ping when sending alerts (optional)")
        .setRequired(false)
    )
    .setDefaultMemberPermissions(0),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const currentGuildConfig = interaction.client.config.guilds.find(
      (g) => g.id === interaction.guildId
    );
    const newEnableWeeklyRaceAlert =
      interaction.options.getBoolean("one-hour-warning");
    const newEnableWeeklyRaceRoomAlert =
      interaction.options.getBoolean("race-room-alert");
    const newWeeklyRaceAlertChannel = interaction.options.getChannel("channel");
    const newWeeklyRaceAlertRole = interaction.options.getRole("role-to-ping");

    const guildUpdate = {
      enableWeeklyRaceAlert: newEnableWeeklyRaceAlert,
      enableWeeklyRaceRoomAlert: newEnableWeeklyRaceRoomAlert,
    };
    currentGuildConfig.enableWeeklyRaceAlert = newEnableWeeklyRaceAlert;
    currentGuildConfig.enableWeeklyRaceRoomAlert = newEnableWeeklyRaceRoomAlert;

    if (newWeeklyRaceAlertChannel) {
      guildUpdate.weeklyRaceAlertChannel = newWeeklyRaceAlertChannel.id;
      currentGuildConfig.weeklyRaceAlertChannel = newWeeklyRaceAlertChannel.id;
    }
    if (newWeeklyRaceAlertRole) {
      guildUpdate.weeklyRaceAlertRole = newWeeklyRaceAlertRole.id;
      currentGuildConfig.weeklyRaceAlertRole = newWeeklyRaceAlertRole.id;
    }

    await this.helpaApi.api.patch(
      `/api/discord/guild/${interaction.guildId}`,
      guildUpdate
    );

    await interaction.editReply({
      content: "I totally set those values for you.",
      ephemeral: true,
    });
  },
};
