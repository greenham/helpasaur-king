const { EmbedBuilder } = require("discord.js");
const commands = require("../../lib/commands");
let aliasList;

module.exports = {
  name: "messageCreate",
  async execute(interaction) {
    const { author, content, guildId } = interaction;
    let command = false;

    // Make sure it starts with the configured prefix
    // @TODO: Support per-guild prefixes
    if (!content.startsWith("!")) return;

    // Sweep out everything that's not the command
    const commandNoPrefix = content.slice(1).split(" ")[0].toLowerCase();

    // Try to find the command in the database
    try {
      command = await commands.get(commandNoPrefix);
    } catch (err) {
      console.error(`Error while fetching command: ${err}`);
      return;
    }

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

    if (command.aliases && command.aliases.length > 0) {
      aliasList = [...command.aliases];

      // Determine if the original command or an alias was used
      if (command.aliases.includes(commandNoPrefix)) {
        // Alias was used, remove it from the list, and add the original command
        aliasList = aliasList.filter((a) => a != commandNoPrefix);
        aliasList.push(command.command);
      }
      response.setFooter({ text: `Aliases: ${aliasList.join(", ")}` });
    }

    // Reply to the user
    await interaction.reply({ embeds: [response] });
  },
};
