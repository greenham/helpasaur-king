"use strict";
const { defaultGuildConfig } = require("../constants");
module.exports = {
    name: "guildCreate",
    async execute(guild) {
        console.log(`Joined guild ${guild.name} (${guild.id})`);
        const { client } = guild;
        // See if there's an existing configuration for this guild
        const guildConfigIndex = client.config.guilds.findIndex((g) => g.id === guild.id);
        if (guildConfigIndex !== -1) {
            console.log(`Guild ${guild.name} (${guild.id}) is already configured`);
            // Re-activate guild if necessary
            if (!client.config.guilds[guildConfigIndex].active) {
                console.log(`Re-activating guild ${guild.name} (${guild.id})`);
                try {
                    await this.helpaApi.api.patch(`/api/discord/guild/${guild.id}`, {
                        active: true,
                    });
                    console.log(`Re-activated guild ${guild.name} (${guild.id})`);
                    // Update the local config
                    client.config.guilds[guildConfigIndex].active = true;
                }
                catch (err) {
                    console.error(`Error re-activating guild ${guild.name} (${guild.id}): ${err.message}`);
                }
            }
            else {
                console.log(`Guild ${guild.name} (${guild.id}) is already active, nothing to do here.`);
            }
            return;
        }
        const guildConfig = Object.assign({ id: guild.id, name: guild.name }, defaultGuildConfig);
        console.log(`Creating config for guild ${guild.name} (${guild.id})`);
        // Create this guild via the API
        try {
            await this.helpaApi.api.post(`/api/discord/guild`, guildConfig);
            // Update the local config
            client.config.guilds.push(guildConfig);
        }
        catch (err) {
            console.error(`Error creating guild ${guild.name} (${guild.id}) via API: ${err.message}`);
            return;
        }
    },
};
//# sourceMappingURL=guildCreate.js.map