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
    await interaction.editReply({
      content: "I totally set those values for you.",
      ephemeral: true,
    });
  },
};
