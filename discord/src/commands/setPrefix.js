const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("helpa-prefix")
    .setDescription("Sets the prefix to be used for commands")
    .addStringOption((option) =>
      option
        .setName("prefix")
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
    .setDefaultMemberPermissions(0),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    await interaction.editReply({
      content: "I totally set the prefix for you.",
      ephemeral: true,
    });
  },
};
