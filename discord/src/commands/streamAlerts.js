const { SlashCommandBuilder, ChannelType } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("helpa-streams")
    .setDescription("Manage stream alerts")
    .addBooleanOption((option) =>
      option
        .setName("enable")
        .setDescription("Be sure to set a channel if you enable these!")
        .setRequired(true)
    )
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("The text channel to send stream alerts to")
        .setRequired(false)
        .addChannelTypes(ChannelType.GuildText)
    )
    .setDefaultMemberPermissions(0),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const currentGuildConfig = interaction.client.config.guilds.find(
      (g) => g.id === interaction.guildId
    );
    const newEnableStreamAlerts = interaction.options.getBoolean("enable");
    const newStreamAlertsChannel = interaction.options.getChannel("channel");

    const guildUpdate = {
      enableStreamAlerts: newEnableStreamAlerts,
    };
    currentGuildConfig.enableStreamAlerts = newEnableStreamAlerts;

    if (newStreamAlertsChannel) {
      guildUpdate.streamAlertsChannelId = newStreamAlertsChannel.id;
      currentGuildConfig.streamAlertsChannelId = newStreamAlertsChannel.id;
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
