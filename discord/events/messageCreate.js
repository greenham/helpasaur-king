const { EmbedBuilder, Collection } = require("discord.js");
const axios = require("axios");
const { API_URL } = process.env;
const defaultConfig = {
  cmdPrefix: "!",
  textCmdCooldown: 10,
};
let aliasList;
let cooldowns = new Collection();

module.exports = {
  name: "messageCreate",
  async execute(interaction) {
    const { author, content, guildId, client } = interaction;
    let command = false;

    //  See if there's a specific configuration for this guild
    let guildConfig = client.config.guilds.find((g) => g.id === guildId);
    if (!guildConfig) {
      guildConfig = Object.assign({}, defaultConfig);
    }

    const { cmdPrefix, textCmdCooldown } = guildConfig;

    // Make sure it starts with the correct prefix
    if (!content.startsWith(cmdPrefix)) return;

    // Sweep out everything that's not the command and make it case-insensitive
    const commandNoPrefix = content.slice(1).split(" ")[0].toLowerCase();

    // Try to find the command in the database
    try {
      const response = await axios.post(`${API_URL}/commands/find`, {
        command: commandNoPrefix,
      });

      if (response.status === 200) {
        command = response.data;
      }
    } catch (err) {
      console.error(`Error while fetching command: ${err}`);
      return;
    }

    // Handle command not found
    if (!command) return;

    // @TODO: Make sure the user is permitted to use commands

    // @TODO: Make sure the command isn't on cooldown in this guild
    let onCooldown = false;
    let cooldownKey = command.command + guildId;
    let timeUsed = cooldowns.get(cooldownKey);
    if (timeUsed) {
      let now = Date.now();
      // Command was recently used, check timestamp to see if it's on cooldown
      if (now - timeUsed <= textCmdCooldown * 1000) {
        // Calculate how much longer it's on cooldown
        onCooldown = (textCmdCooldown * 1000 - (now - timeUsed)) / 1000;
      }
    }

    if (onCooldown !== false) {
      await interaction.reply({
        content: `Command is on cooldown for another ${onCooldown} seconds`,
        ephemeral: true,
      });
      return;
    }

    console.log(
      `Received command ${commandNoPrefix} from ${author.username}#${author.discriminator} in guild ${guildId}`
    );

    // Build the command response
    const response = new EmbedBuilder()
      .setColor(0xdedede)
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

    // Place command on cooldown
    cooldowns.set(cooldownKey, Date.now());

    // @TODO: Make an API call to increment the counter for useage
  },
};
