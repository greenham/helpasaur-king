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
    await interaction.editReply({
      content: "I totally set that value for you.",
      ephemeral: true,
    });
  },
};
