import { Guild } from "discord.js"
import { DiscordEvent, ExtendedClient } from "../types"
import { GuildConfig } from "@helpasaur/types"

const guildDeleteEvent: DiscordEvent<"guildDelete"> = {
  name: "guildDelete",
  async execute(guild: Guild) {
    console.log(
      `Guild ${guild.name} (${guild.id}) kicked us or the guild was deleted`
    )
    const client = guild.client as ExtendedClient

    // See if there's an existing configuration for this guild
    const guildConfigIndex = client.config.guilds.findIndex(
      (g: GuildConfig) => g.id === guild.id
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
    } catch (err) {
      console.error(
        `Error deleting guild ${guild.name} (${guild.id}) via API:`,
        err instanceof Error ? err.message : err
      )
    }
  },
}

module.exports = guildDeleteEvent
