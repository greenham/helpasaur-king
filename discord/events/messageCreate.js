const { Collection, EmbedBuilder } = require("discord.js");
const staticCommands = require("../static-commands.json");
const commands = new Collection();

staticCommands
  .filter((c) => c.enabled && !c.deleted)
  .forEach((command) => {
    commands.set(command.command, command);

    if (command.aliases.length > 0) {
      command.aliases.forEach((alias) => {
        commands.set(alias, command);
      });
    }
  });

module.exports = {
  name: "messageCreate",
  async execute(interaction) {
    const { author, content, guildId } = interaction;

    // Make sure it starts with the configured prefix
    if (!content.startsWith("!")) return;

    // Sweep out everything that's not the command
    const commandNoPrefix = content.slice(1).split(" ")[0].toLowerCase();

    // Try to find the command in our collection
    const command = commands.get(commandNoPrefix);

    // Handle command not found
    if (!command) return;

    // @TODO: Make sure the user is permitted to use commands

    console.log(
      `Received command ${commandNoPrefix} from ${author.username}#${author.discriminator} in guild ${guildId}`
    );

    // Build the command response
    const response = new EmbedBuilder()
      .setColor(0xbada55)
      .setTitle(commandNoPrefix)
      .setDescription(command.response);

    if (command.aliases.length > 0) {
      response.setFooter({ text: `Aliases: ${command.aliases.join(", ")}` });
    }

    // Reply to the user
    await interaction.reply({ embeds: [response] });
  },
};
