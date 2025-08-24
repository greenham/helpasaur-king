import { Guild } from "discord.js"
import { defaultGuildConfig } from "../constants"
import { DiscordEvent, ExtendedClient } from "../types"
import { GuildConfig } from "@helpasaur/types"

const guildCreateEvent: DiscordEvent<"guildCreate"> = {
  name: "guildCreate",
  async execute(guild: Guild) {
    console.log(`Joined guild ${guild.name} (${guild.id})`)
    const client = guild.client as ExtendedClient

    // See if there's an existing configuration for this guild
    const guildConfigIndex = client.config.guilds.findIndex(
      (g: GuildConfig) => g.id === guild.id
    )
    if (guildConfigIndex !== -1) {
      console.log(`Guild ${guild.name} (${guild.id}) is already configured`)
      // Re-activate guild if necessary
      if (!client.config.guilds[guildConfigIndex].active) {
        console.log(`Re-activating guild ${guild.name} (${guild.id})`)
        try {
          await this.helpaApi?.discord.updateGuildConfig(guild.id, {
            active: true,
          })
          console.log(`Re-activated guild ${guild.name} (${guild.id})`)

          // Update the local config
          client.config.guilds[guildConfigIndex].active = true
        } catch (err) {
          console.error(
            `Error re-activating guild ${guild.name} (${guild.id}):`,
            err instanceof Error ? err.message : err
          )
        }
      } else {
        console.log(
          `Guild ${guild.name} (${guild.id}) is already active, nothing to do here.`
        )
      }
      return
    }

    const guildConfig = Object.assign(
      {
        guildId: guild.id,
        guildName: guild.name,
        id: guild.id,
        name: guild.name,
      },
      defaultGuildConfig
    )

    console.log(`Creating config for guild ${guild.name} (${guild.id})`)

    // Create this guild via the API
    try {
      await this.helpaApi?.discord.createGuildConfig(guildConfig)

      // Update the local config
      client.config.guilds.push(guildConfig)
    } catch (err) {
      console.error(
        `Error creating guild ${guild.name} (${guild.id}) via API:`,
        err instanceof Error ? err.message : err
      )
      return
    }
  },
}

module.exports = guildCreateEvent
