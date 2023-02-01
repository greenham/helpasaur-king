const fs = require("node:fs");
const path = require("node:path");
const { Client, GatewayIntentBits, ActivityType } = require("discord.js");
const axios = require("axios");
const { API_URL } = process.env;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
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
    client.once(event.name, (...args) => event.execute(...args));
  } else {
    client.on(event.name, (...args) => event.execute(...args));
  }
}

// Fetch config via API
axios
  .get(`${API_URL}/configs/discord`)
  .then((result) => {
    // Store the config
    client.config = Object.assign({}, result.data.config);

    client.setRandomActivity = () => {
      let activity =
        client.config.activities[
          Math.floor(Math.random() * client.config.activities.length)
        ];
      console.log(`Setting Discord activity to: ${activity}`);
      client.user.setActivity(activity, {
        type: ActivityType.Streaming,
        url: `https://twitch.tv/helpasaurking`,
      });
    };

    // Log the bot in to Discord
    client.login(client.config.token);
  })
  .catch((err) => {
    console.error(`Error fetching config: ${err.message}`);

    // @TODO: build in retry
  });

process.on("unhandledRejection", (error) => {
  console.error("Unhandled promise rejection:", error);
});
