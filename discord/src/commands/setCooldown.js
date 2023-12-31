const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("helpa-cooldown")
    .setDescription("Sets the cooldown to be used for commands")
    .addIntegerOption((option) =>
      option
        .setName("cooldown")
        .setDescription("Number of seconds (must be at least 5)")
        .setRequired(true)
        .setMinValue(5)
        .setMaxValue(3600)
    )
    .setDefaultMemberPermissions(0),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const newCooldown = interaction.options.getInteger("cooldown");
    const currentGuildConfig = interaction.client.config.guilds.find(
      (g) => g.id === interaction.guildId
    );
    if (currentGuildConfig.textCmdCooldown === newCooldown) {
      await interaction.editReply({
        content: "That's already the cooldown!",
        ephemeral: true,
      });
      return;
    }
    await this.helpaApi.api.patch(`/api/discord/guild/${interaction.guildId}`, {
      textCmdCooldown: newCooldown,
    });
    currentGuildConfig.textCmdCooldown = newCooldown;
    await interaction.editReply({
      content: "I totally set the cooldown for you.",
      ephemeral: true,
    });
  },
};
