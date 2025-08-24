import {
  ActivityType,
  Client,
  Collection,
  Events,
  GatewayIntentBits,
  Partials,
  MessageFlags,
} from "discord.js"
import * as fs from "node:fs"
import * as path from "node:path"
import { HelpaApi } from "@helpasaur/api-client"
import { DiscordConfig } from "./types/config"
import { DiscordCommand, DiscordEvent, ExtendedClient } from "./types"

export class DiscordBot {
  public discordClient: ExtendedClient
  private helpaApi: HelpaApi

  constructor(config: DiscordConfig, helpaApi: HelpaApi) {
    this.discordClient = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
      ],
      partials: [Partials.Channel],
    }) as ExtendedClient

    this.discordClient.config = config
    this.discordClient.commands = new Collection()
    this.discordClient.setRandomActivity = () => {
      const activities =
        (this.discordClient.config as { activities?: string[] }).activities ||
        []
      if (activities.length === 0) return

      const activity = activities[Math.floor(Math.random() * activities.length)]
      console.log(`Setting Discord activity to: ${activity}`)
      if (this.discordClient.user) {
        this.discordClient.user.setActivity(activity, {
          type: ActivityType.Streaming,
          url: `https://twitch.tv/helpasaurking`, // @TODO Pull from config/env
        })
      }
    }

    this.helpaApi = helpaApi
    // Update service config every minute so we pick up guild changes quickly
    setInterval(() => {
      this.refreshConfig()
    }, 60000) // @TODO Make this configurable
  }

  start(): void {
    // Log the bot in to Discord
    console.log(`Logging bot into Discord...`)
    this.discordClient.login(this.discordClient.config.token)

    // @TODO: Make sure the login succeeds before proceeding
    this.handleEvents()
    this.handleCommands()
  }

  refreshConfig(): void {
    this.helpaApi
      .getServiceConfig()
      .then((config) => {
        if (!config || !config.config) {
          throw new Error(`Unable to refresh service config from API!`)
        }

        this.discordClient.config = config.config as unknown as DiscordConfig
      })
      .catch((error: Error) => {
        console.error("🛑 Error refreshing service config:", error)
      })
  }

  /**
   * Load module files from a directory and inject helpaApi
   * @param directory - The directory name to load modules from
   * @returns Array of modules with helpaApi injected
   */
  private loadModulesFromDirectory<T>(directory: string): T[] {
    const dirPath = path.join(__dirname, directory)
    const moduleFiles = fs
      .readdirSync(dirPath)
      .filter(
        (file) =>
          !file.endsWith(".d.ts") &&
          (file.endsWith(".js") || file.endsWith(".ts"))
      )

    return moduleFiles.map((file) => {
      const filePath = path.join(dirPath, file)
      const module = require(filePath) as T
      // Create a new object with helpaApi instead of mutating the imported one
      return { ...module, helpaApi: this.helpaApi, filePath }
    })
  }

  handleEvents(): void {
    // Read in events to be handled
    const events = this.loadModulesFromDirectory<DiscordEvent>("events")

    for (const event of events) {
      if (event.once) {
        this.discordClient.once(event.name, (...args) => event.execute(...args))
      } else {
        this.discordClient.on(event.name, (...args) => event.execute(...args))
      }
    }
  }

  handleCommands(): void {
    // Read in commands to be handled
    const commands = this.loadModulesFromDirectory<DiscordCommand>("commands")

    for (const command of commands) {
      // Set a new item in the Collection with the key as the command name and the value as the exported module
      const { filePath } = command
      if ("data" in command && "execute" in command) {
        this.discordClient.commands.set(command.data.name, command)
      } else {
        console.log(
          `⚠️ The command at ${filePath} is missing a required "data" or "execute" property.`
        )
      }
    }

    this.discordClient.on(Events.InteractionCreate, async (interaction) => {
      if (!interaction.isChatInputCommand()) return

      const command = this.discordClient.commands.get(interaction.commandName)

      if (!command) {
        console.error(
          `No command matching ${interaction.commandName} was found.`
        )
        return
      }

      try {
        await command.execute(interaction)
      } catch (error) {
        console.error(error)
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({
            content: "There was an error while executing this command!",
            flags: [MessageFlags.Ephemeral],
          })
        } else {
          await interaction.reply({
            content: "There was an error while executing this command!",
            flags: [MessageFlags.Ephemeral],
          })
        }
      }
    })
  }
}
