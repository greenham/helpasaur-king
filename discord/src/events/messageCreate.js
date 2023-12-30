const { EmbedBuilder, Collection } = require("discord.js");
const { defaultGuildConfig } = require("../constants");
let aliasList;
let cachedCommands = new Collection();
let cooldowns = new Collection();

module.exports = {
  name: "messageCreate",
  async execute(interaction) {
    const { author, content, guildId, client } = interaction;
    let command = false;

    //  See if there's an internal configuration for this guild
    let guildConfig = client.config.guilds.find((g) => g.id === guildId);
    if (!guildConfig) {
      guildConfig = Object.assign({}, defaultGuildConfig);
    }

    const { cmdPrefix, textCmdCooldown } = guildConfig;

    // Make sure the content starts with the correct prefix
    if (!content.startsWith(cmdPrefix)) return;

    // Sweep out everything that's not the command and make it case-insensitive
    const commandNoPrefix = content.slice(1).split(" ")[0].toLowerCase();

    if (commandNoPrefix === "auth") {
      await interaction.reply({
        content: `https://discord.com/api/oauth2/authorize?client_id=${
          client.config.clientId
        }&permissions=${
          client.config.oauth.permissions
        }&scope=${client.config.oauth.scopes.join("%20")}`,
        ephemeral: true,
      });
      return;
    }

    // Try to find the command in the cache
    let cachedCommand = cachedCommands.get(commandNoPrefix);

    // If it's cached, make sure it's not too stale
    if (cachedCommand && Date.now() > cachedCommand.staleAfter) {
      cachedCommand = false;
    }

    if (!cachedCommand) {
      // Not cached, try to find the command in the database
      try {
        const response = await this.helpaApi.api.post(`/api/commands/find`, {
          command: commandNoPrefix,
        });

        if (response.status === 200) {
          command = response.data;

          if (command) {
            // Cache it for 10 minutes
            command.staleAfter = Date.now() + 10 * 60 * 1000;
            cachedCommands.set(commandNoPrefix, command);
          }
        }
      } catch (err) {
        console.error(`Error while fetching command: ${err}`);
        return;
      }
    } else {
      // Use cached version
      command = cachedCommand;
    }

    // Handle command not found
    if (!command) return;

    // @TODO: Make sure the user is permitted to use commands

    // Make sure the command isn't on cooldown in this guild
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
      return;
    }

    console.log(
      `Received command <${commandNoPrefix}> from <${author.username}> in guild <${guildConfig.internalName}>`
    );

    // Build the command response
    const response = new EmbedBuilder()
      .setColor(0xdedede)
      .setTitle(commandNoPrefix)
      .setDescription(command.response);

    let aliasUsed = "";
    if (command.aliases && command.aliases.length > 0) {
      aliasList = [...command.aliases];

      // Determine if the original command or an alias was used
      if (command.aliases.includes(commandNoPrefix)) {
        // Alias was used, remove it from the list, and add the original command
        aliasList = aliasList.filter((a) => a != commandNoPrefix);
        aliasList.push(command.command);
        aliasUsed = commandNoPrefix;
      }
      response.setFooter({ text: `Aliases: ${aliasList.join(", ")}` });
    }

    // Reply to the user
    await interaction.reply({ embeds: [response] });

    // Place command on cooldown
    cooldowns.set(cooldownKey, Date.now());

    // Log command use
    await this.helpaApi.api.post(`/api/commands/logs`, {
      command: command.command,
      alias: aliasUsed,
      source: "discord",
      username: author.username,
      metadata: {
        guild: guildConfig.internalName,
        author,
      },
    });
  },
};
