const {
  ActivityType,
  Client,
  GatewayIntentBits,
  Partials,
} = require("discord.js");
const fs = require("node:fs");
const path = require("node:path");

class DiscordBot {
  constructor(config, helpaApi) {
    this.config = config;
    this.helpaApi = helpaApi;

    this.discordClient = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
      ],
      partials: [Partials.Channel],
    });
  }

  async start() {
    this.discordClient.setRandomActivity = () => {
      let activity =
        this.config.activities[
          Math.floor(Math.random() * this.config.activities.length)
        ];
      console.log(`Setting Discord activity to: ${activity}`);
      this.discordClient.user.setActivity(activity, {
        type: ActivityType.Streaming,
        url: `https://twitch.tv/helpasaurking`,
      });
    };

    // Log the bot in to Discord
    console.log(`Logging bot into Discord...`);
    this.discordClient.login(this.config.token);

    // @TODO: Make sure the login succeeds before handling events
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
exports.DiscordBot = DiscordBot;
