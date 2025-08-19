import { Guild } from "discord.js"
import { DiscordEvent } from "../types"

const guildDeleteEvent: DiscordEvent = {
  name: "guildDelete",
  async execute(guild: Guild) {
    console.log(
      `Guild ${guild.name} (${guild.id}) kicked us or the guild was deleted`
    )
    const { client } = guild as any // TODO: Type the extended client properly

    // See if there's an existing configuration for this guild
    const guildConfigIndex = client.config.guilds.findIndex(
      (g: any) => g.id === guild.id
    )
    if (guildConfigIndex === -1) {
      console.log(`Guild ${guild.name} (${guild.id}) does not exist!`)
      return
    }

    console.log(`Removing config for guild ${guild.name} (${guild.id})`)

    // De-activate this guild via the API
    try {
      await this.helpaApi?.discord.updateGuildConfig(guild.id, {
        active: false,
      })

      // Update the local config
      client.config.guilds[guildConfigIndex].active = false
    } catch (err: any) {
      console.error(
        `Error deleting guild ${guild.name} (${guild.id}) via API: ${err.message}`
      )
    }
  },
}

module.exports = guildDeleteEvent
