import {
  ActivityType,
  Client,
  Collection,
  Events,
  GatewayIntentBits,
  Partials,
  ChatInputCommandInteraction,
} from "discord.js"
import fs from "node:fs"
import path from "node:path"
import { HelpaApi } from "helpa-api-client"

interface BotConfig {
  token: string
  activities: string[]
  guilds: any[]
  [key: string]: any
}

interface Command {
  data: {
    name: string
    [key: string]: any
  }
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>
  helpaApi?: HelpaApi
}

interface ExtendedClient extends Client {
  config: BotConfig
  commands: Collection<string, Command>
  setRandomActivity: () => void
}

class DiscordBot {
  public discordClient: ExtendedClient
  private helpaApi: HelpaApi

  constructor(config: BotConfig, helpaApi: HelpaApi) {
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
      const activity =
        this.discordClient.config.activities[
          Math.floor(
            Math.random() * this.discordClient.config.activities.length
          )
        ]
      console.log(`Setting Discord activity to: ${activity}`)
      this.discordClient.user?.setActivity(activity, {
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

  private refreshConfig(): void {
    this.helpaApi
      .getServiceConfig()
      .then((config) => {
        if (!config) {
          throw new Error(`Unable to refresh service config from API!`)
        }

        this.discordClient.config = config as BotConfig
      })
      .catch((error) => {
        console.error("🛑 Error refreshing service config:", error)
      })
  }

  private handleEvents(): void {
    // Read in events to be handled
    const eventsPath = path.join(__dirname, "events")
    const eventFiles = fs
      .readdirSync(eventsPath)
      .filter((file) => file.endsWith(".js") || file.endsWith(".ts"))

    for (const file of eventFiles) {
      const filePath = path.join(eventsPath, file)
      const event = require(filePath)
      event.helpaApi = this.helpaApi
      if (event.once) {
        this.discordClient.once(event.name, (...args) =>
          event.execute(...args)
        )
      } else {
        this.discordClient.on(event.name, (...args) => event.execute(...args))
      }
    }
  }

  private handleCommands(): void {
    // Read in commands to be handled
    const commandsPath = path.join(__dirname, "commands")
    const commandFiles = fs
      .readdirSync(commandsPath)
      .filter((file) => file.endsWith(".js") || file.endsWith(".ts"))

    for (const file of commandFiles) {
      const filePath = path.join(commandsPath, file)
      const command: Command = require(filePath)
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

    this.discordClient.on(
      Events.InteractionCreate,
      async (interaction) => {
        if (!interaction.isChatInputCommand()) return

        const command = this.discordClient.commands.get(
          interaction.commandName
        )

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
      }
    )
  }
}

export { DiscordBot }