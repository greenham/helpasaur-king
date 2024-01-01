const {
  ActivityType,
  Client,
  Collection,
  Events,
  GatewayIntentBits,
  Partials,
} = require("discord.js");
const fs = require("node:fs");
const path = require("node:path");

class DiscordBot {
  constructor(config, helpaApi) {
    this.discordClient = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
      ],
      partials: [Partials.Channel],
    });

    this.discordClient.config = config;
    this.discordClient.commands = new Collection();
    this.discordClient.setRandomActivity = () => {
      let activity =
        this.discordClient.config.activities[
          Math.floor(
            Math.random() * this.discordClient.config.activities.length
          )
        ];
      console.log(`Setting Discord activity to: ${activity}`);
      this.discordClient.user.setActivity(activity, {
        type: ActivityType.Streaming,
        url: `https://twitch.tv/helpasaurking`,
      });
    };

    this.helpaApi = helpaApi;
    // Update service config every minute so we pick up guild changes quickly
    setInterval(() => {
      this.refreshConfig();
    }, 60000);
  }

  start() {
    // Log the bot in to Discord
    console.log(`Logging bot into Discord...`);
    this.discordClient.login(this.discordClient.config.token);

    // @TODO: Make sure the login succeeds before proceeding
    this.handleEvents();
    this.handleCommands();
  }

  refreshConfig() {
    this.helpaApi
      .getServiceConfig()
      .then((config) => {
        if (!config) {
          throw new Error(`Unable to refresh service config from API!`);
        }

        this.discordClient.config = config;
        console.log(`✅ Refreshed service config from API!`);
      })
      .catch((error) => {
        console.error("🛑 Error refreshing service config:", error);
      });
  }

  handleEvents() {
    // Read in events to be handled
    const eventsPath = path.join(__dirname, "events");
    const eventFiles = fs
      .readdirSync(eventsPath)
      .filter((file) => file.endsWith(".js"));

    for (const file of eventFiles) {
      const filePath = path.join(eventsPath, file);
      const event = require(filePath);
      event.helpaApi = this.helpaApi;
      if (event.once) {
        this.discordClient.once(event.name, (...args) =>
          event.execute(...args)
        );
      } else {
        this.discordClient.on(event.name, (...args) => event.execute(...args));
      }
    }
  }

  handleCommands() {
    // Read in commands to be handled
    const commandsPath = path.join(__dirname, "commands");
    const commandFiles = fs
      .readdirSync(commandsPath)
      .filter((file) => file.endsWith(".js"));

    for (const file of commandFiles) {
      const filePath = path.join(commandsPath, file);
      const command = require(filePath);
      command.helpaApi = this.helpaApi;
      // Set a new item in the Collection with the key as the command name and the value as the exported module
      if ("data" in command && "execute" in command) {
        this.discordClient.commands.set(command.data.name, command);
      } else {
        console.log(
          `⚠ The command at ${filePath} is missing a required "data" or "execute" property.`
        );
      }
    }

    this.discordClient.on(Events.InteractionCreate, async (interaction) => {
      if (!interaction.isChatInputCommand()) return;

      const command = this.discordClient.commands.get(interaction.commandName);

      if (!command) {
        console.error(
          `No command matching ${interaction.commandName} was found.`
        );
        return;
      }

      try {
        await command.execute(interaction);
      } catch (error) {
        console.error(error);
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({
            content: "There was an error while executing this command!",
            ephemeral: true,
          });
        } else {
          await interaction.reply({
            content: "There was an error while executing this command!",
            ephemeral: true,
          });
        }
      }
    });
  }
}
exports.DiscordBot = DiscordBot;
