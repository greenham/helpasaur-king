import {
  ActivityType,
  Client,
  Collection,
  Events,
  GatewayIntentBits,
  Partials,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js"
import * as fs from "node:fs"
import * as path from "node:path"
import { HelpaApi } from "helpa-api-client"
import { DiscordConfig } from "@helpasaur/types"

interface DiscordCommand {
  data: SlashCommandBuilder | any
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>
  helpaApi?: HelpaApi
}

interface ExtendedClient extends Client {
  config: DiscordConfig
  commands: Collection<string, DiscordCommand>
  setRandomActivity: () => void
}

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
      const activities = (this.discordClient.config as any).activities || []
      if (activities.length === 0) return

      let activity = activities[Math.floor(Math.random() * activities.length)]
      console.log(`Setting Discord activity to: ${activity}`)
      this.discordClient.user!.setActivity(activity, {
        type: ActivityType.Streaming,
        url: `https://twitch.tv/helpasaurking`,
      })
    }

    this.helpaApi = helpaApi
    // Update service config every minute so we pick up guild changes quickly
    setInterval(() => {
      this.refreshConfig()
    }, 60000)
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
      .then((config: any) => {
        if (!config) {
          throw new Error(`Unable to refresh service config from API!`)
        }

        this.discordClient.config = config as DiscordConfig
      })
      .catch((error: any) => {
        console.error("🛑 Error refreshing service config:", error)
      })
  }

  handleEvents(): void {
    // Read in events to be handled
    const eventsPath = path.join(__dirname, "events")
    const eventFiles = fs
      .readdirSync(eventsPath)
      .filter((file) => file.endsWith(".js") || file.endsWith(".ts"))

    for (const file of eventFiles) {
      const filePath = path.join(eventsPath, file)
      const event: any = require(filePath)
      event.helpaApi = this.helpaApi
      if (event.once) {
        this.discordClient.once(event.name, (...args) => event.execute(...args))
      } else {
        this.discordClient.on(event.name, (...args) => event.execute(...args))
      }
    }
  }

  handleCommands(): void {
    // Read in commands to be handled
    const commandsPath = path.join(__dirname, "commands")
    const commandFiles = fs
      .readdirSync(commandsPath)
      .filter((file) => file.endsWith(".js") || file.endsWith(".ts"))

    for (const file of commandFiles) {
      const filePath = path.join(commandsPath, file)
      const command: DiscordCommand = require(filePath)
      command.helpaApi = this.helpaApi
      // Set a new item in the Collection with the key as the command name and the value as the exported module
      if ("data" in command && "execute" in command) {
        this.discordClient.commands.set(command.data.name, command)
      } else {
        console.log(
          `⚠ The command at ${filePath} is missing a required "data" or "execute" property.`
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
            ephemeral: true,
          })
        } else {
          await interaction.reply({
            content: "There was an error while executing this command!",
            ephemeral: true,
          })
        }
      }
    })
  }
}
