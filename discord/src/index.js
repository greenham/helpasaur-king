const fs = require("node:fs");
const path = require("node:path");
const {
  ActivityType,
  Client,
  GatewayIntentBits,
  Partials,
} = require("discord.js");
const { HelpaApi } = require("helpa-api-client");

const helpaApi = new HelpaApi({
  apiHost: process.env.API_HOST,
  apiKey: process.env.API_KEY,
  serviceName: process.env.SERVICE_NAME,
});

const discordClient = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel],
});

// Read in events to be handled
const eventsPath = path.join(__dirname, "events");
const eventFiles = fs
  .readdirSync(eventsPath)
  .filter((file) => file.endsWith(".js"));

for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  const event = require(filePath);
  if (event.once) {
    discordClient.once(event.name, (...args) => event.execute(...args));
  } else {
    discordClient.on(event.name, (...args) => event.execute(...args));
  }
}

const init = async () => {
  // Get the service config from the API
  discordClient.config = await helpaApi.getServiceConfig();
  if (!discordClient.config) {
    throw new Error(`Unable to get service config from API!`);
  }

  discordClient.setRandomActivity = () => {
    let activity =
      discordClient.config.activities[
        Math.floor(Math.random() * discordClient.config.activities.length)
      ];
    console.log(`Setting Discord activity to: ${activity}`);
    discordClient.user.setActivity(activity, {
      type: ActivityType.Streaming,
      url: `https://twitch.tv/helpasaurking`,
    });
  };

  // Log the bot in to Discord
  console.log(`Logging bot into Discord...`);
  discordClient.login(discordClient.config.token);
};

init();

process.on("unhandledRejection", (error) => {
  console.error("Unhandled promise rejection:", error);
});
