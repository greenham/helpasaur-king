const fs = require("node:fs");
const path = require("node:path");
const {
  ActivityType,
  Client,
  GatewayIntentBits,
  Partials,
} = require("discord.js");
const { HelpaApi } = require("helpa-api-client");

class DiscordBot {
  constructor(helpaApi) {
    this.discordClient = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
      ],
      partials: [Partials.Channel],
    });

    this.helpaApi = helpaApi;
  }

  async init() {
    // Get the service config from the API
    this.discordClient.config = await this.helpaApi.getServiceConfig();
    if (!this.discordClient.config) {
      throw new Error(`Unable to get service config from API!`);
    }

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

    // Log the bot in to Discord
    console.log(`Logging bot into Discord...`);
    this.discordClient.login(this.discordClient.config.token);

    // @TODO: Make sure the login succeeds

    // Start handling events
    this.handleEvents();
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
}

const helpaApiClient = new HelpaApi({
  apiHost: process.env.API_HOST,
  apiKey: process.env.API_KEY,
  serviceName: process.env.SERVICE_NAME,
});
const bot = new DiscordBot(helpaApiClient);

bot.init();

process.on("unhandledRejection", (error) => {
  console.error("Unhandled promise rejection:", error);
});
