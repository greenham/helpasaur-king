import { EmbedBuilder, Collection, Message, MessageFlags } from "discord.js"
import { defaultGuildConfig } from "../constants"
import { DiscordEvent } from "../types/events"

let aliasList: string[] | undefined
let cachedCommands = new Collection<string, any>()
let cooldowns = new Collection<string, number>()

const messageCreateEvent: DiscordEvent = {
  name: "messageCreate",
  async execute(interaction: Message) {
    const { author, content, guildId, client } = interaction as any

    //  See if there's an internal configuration for this guild
    let guildConfig = client.config.guilds.find((g: any) => g.id === guildId)
    if (!guildConfig) {
      guildConfig = Object.assign({}, defaultGuildConfig)
    }

    if (guildConfig.active === false) return

    const { cmdPrefix, textCmdCooldown } = guildConfig

    // Make sure the content starts with the correct prefix
    if (!content.startsWith(cmdPrefix)) return

    // Sweep out everything that's not the command and make it case-insensitive
    const commandNoPrefix = content.slice(1).split(" ")[0].toLowerCase()

    if (commandNoPrefix === "auth") {
      await interaction.reply({
        content: `https://discord.com/api/oauth2/authorize?client_id=${
          client.config.clientId
        }&permissions=${
          client.config.oauth.permissions
        }&scope=${client.config.oauth.scopes.join("%20")}`,
        flags: [MessageFlags.Ephemeral],
      } as any)
      return
    }

    // Try to find the command in the cache
    let cachedCommand = cachedCommands.get(commandNoPrefix)

    // If it's cached, make sure it's not too stale
    if (cachedCommand && Date.now() > cachedCommand.staleAfter) {
      cachedCommand = false
    }

    let command: any = false
    if (!cachedCommand) {
      // Not cached, try to find the command in the database
      try {
        const response = await this.helpaApi?.findCommand({
          command: commandNoPrefix,
        })

        if (response?.result === "success") {
          command = response.data?.command

          if (command) {
            // Cache it for 10 minutes
            command.staleAfter = Date.now() + 10 * 60 * 1000
            cachedCommands.set(commandNoPrefix, command)
          }
        }
      } catch (err) {
        console.error(`Error while fetching command: ${err}`)
        return
      }
    } else {
      // Use cached version
      command = cachedCommand
    }

    // Handle command not found
    if (!command) return

    // @TODO: Make sure the user is permitted to use commands

    // Make sure the command isn't on cooldown in this guild
    let onCooldown: number | false = false
    let cooldownKey = command.command + guildId
    let timeUsed = cooldowns.get(cooldownKey)
    if (timeUsed) {
      let now = Date.now()
      // Command was recently used, check timestamp to see if it's on cooldown
      if (now - timeUsed <= textCmdCooldown * 1000) {
        // Calculate how much longer it's on cooldown
        onCooldown = (textCmdCooldown * 1000 - (now - timeUsed)) / 1000
      }
    }

    if (onCooldown !== false) {
      return
    }

    console.log(
      `Received command <${commandNoPrefix}> from <${author.username}> in guild <${guildConfig.name}>`
    )

    // Build the command response
    const response = new EmbedBuilder()
      .setColor(0xdedede)
      .setTitle(commandNoPrefix)
      .setDescription(command.response)

    let aliasUsed = ""
    if (command.aliases && command.aliases.length > 0) {
      aliasList = [...command.aliases]

      // Determine if the original command or an alias was used
      if (command.aliases.includes(commandNoPrefix)) {
        // Alias was used, remove it from the list, and add the original command
        aliasList = aliasList.filter((a: string) => a != commandNoPrefix)
        aliasList.push(command.command)
        aliasUsed = commandNoPrefix
      }
      response.setFooter({ text: `Aliases: ${aliasList.join(", ")}` })
    }

    // Reply to the user
    try {
      await interaction.reply({ embeds: [response] })
    } catch (err) {
      console.error(`Error while replying to command: ${err}`)
      return
    }

    // Place command on cooldown
    cooldowns.set(cooldownKey, Date.now())

    // Log command use
    await this.helpaApi?.logCommandUsage({
      command: command.command,
      user: author.username,
      channel: guildConfig.name,
      platform: "discord",
      guildId: interaction.guildId || undefined,
    })
  },
}

module.exports = messageCreateEvent
