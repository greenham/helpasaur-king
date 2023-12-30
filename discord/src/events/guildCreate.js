const { defaultGuildConfig } = require("../constants");

module.exports = {
  name: "guildCreate",
  async execute(guild) {
    console.log(`Joined guild ${guild.name} (${guild.id})`);
    const { client } = guild;

    // See if there's an existing configuration for this guild
    // @CONSIDER: Refreshing the config via the API before this
    let guildConfig = client.config.guilds.find((g) => g.id === guild.id);
    if (guildConfig) {
      console.log(`Guild ${guild.name} (${guild.id}) is already configured`);
      return;
    }

    if (!guildConfig) {
      guildConfig = Object.assign(
        { id: guild.id, name: guild.name },
        defaultGuildConfig
      );

      console.log(`Creating config for guild ${guild.name} (${guild.id})`);

      // Create this guild via the API
      await this.helpaApi.api.post(`/api/discord/guildCreate`, guildConfig);

      // Update the local config
      client.config.guilds.push(guildConfig);
    }
  },
};
