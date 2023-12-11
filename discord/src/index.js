const fs = require("node:fs");
const path = require("node:path");
const {
  Client,
  GatewayIntentBits,
  ActivityType,
  Partials,
} = require("discord.js");
const axios = require("axios");
const axiosRetry = require("axios-retry");
const { API_HOST, API_KEY, SERVICE_NAME } = process.env;
const helpaApi = axios.create({
  baseURL: API_HOST,
  headers: { authorization: API_KEY, "X-Service-Name": SERVICE_NAME },
});

axiosRetry(helpaApi, {
  retries: 1000,
  retryDelay: () => 10000,
  onRetry: (retryCount, error, requestConfig) => {
    console.log(`API Request Error:`, error.toString());
    console.log(
      `Retrying call to ${requestConfig.url} (attempt #${retryCount})`
    );
  },
});

const client = new Client({
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
    client.once(event.name, (...args) => event.execute(...args));
  } else {
    client.on(event.name, (...args) => event.execute(...args));
  }
}

// Authorize the service via the API
helpaApi
  .get(`${API_HOST}/auth/service`)
  .then((result) => {
    console.log(`✅ Service authorized with API!`);
    // Get the token from result
    const { token } = result.data;
    // Update the axios headers to use this Bearer token for all future requests
    helpaApi.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    // Fetch config via API
    console.log(`Fetching config from API...`);
    return helpaApi.get(`${API_HOST}/api/configs/discord`);
  })
  .then((result) => {
    // Store the config
    console.log(`✅ Config Retrieved!`);
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
    console.log(`Logging bot into Discord...`);
    client.login(client.config.token);
  })
  .catch((err) => {
    console.error(`🔴 Error fetching config: ${err.message}`);
  });

process.on("unhandledRejection", (error) => {
  console.error("Unhandled promise rejection:", error);
});
