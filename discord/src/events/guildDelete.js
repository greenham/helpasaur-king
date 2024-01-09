module.exports = {
  name: "guildDelete",
  async execute(guild) {
    console.log(
      `Guild ${guild.name} (${guild.id}) kicked us or the guild was deleted`
    );
    const { client } = guild;

    // See if there's an existing configuration for this guild
    let guildConfigIndex = client.config.guilds.findIndex(
      (g) => g.id === guild.id
    );
    if (guildConfigIndex === -1) {
      console.log(`Guild ${guild.name} (${guild.id}) does not exist!`);
      return;
    }

    console.log(`Removing config for guild ${guild.name} (${guild.id})`);

    // Delete this guild via the API
    try {
      await this.helpaApi.api.delete(`/api/discord/guild/${guild.id}`);

      // Update the local config
      client.config.guilds.splice(guildConfigIndex, 1);
    } catch (err) {
      console.error(
        `Error deleting guild ${guild.name} (${guild.id}) via API: ${err.message}`
      );
    }
  },
};
