const { defaultGuildConfig } = require("../constants");

module.exports = {
  name: "guildCreate",
  async execute(guild) {
    console.log(`Joined guild ${guild.name} (${guild.id})`);
    const { client } = guild;

    // See if there's an existing configuration for this guild
    let guildConfig = client.config.guilds.find((g) => g.id === guild.id);
    if (guildConfig) {
      console.log(`Guild ${guild.name} (${guild.id}) is already configured`);
      return;
    }

    guildConfig = Object.assign(
      { id: guild.id, name: guild.name },
      defaultGuildConfig
    );

    console.log(`Creating config for guild ${guild.name} (${guild.id})`);

    // Create this guild via the API
    try {
      await this.helpaApi.api.post(`/api/discord/guild`, guildConfig);

      // Update the local config
      client.config.guilds.push(guildConfig);
    } catch (err) {
      console.error(
        `Error creating guild ${guild.name} (${guild.id}) via API: ${err.message}`
      );
      return;
    }
  },
};
