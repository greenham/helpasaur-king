const { HelpaApi } = require("helpa-api-client");
const { DiscordBot } = require("./bot");

const helpaApiClient = new HelpaApi({
  apiHost: process.env.API_HOST,
  apiKey: process.env.API_KEY,
  serviceName: process.env.SERVICE_NAME,
});

helpaApiClient
  .getServiceConfig()
  .then((config) => {
    if (!config) {
      throw new Error(`Unable to get service config from API!`);
    }

    const bot = new DiscordBot(config, helpaApiClient);
    bot.start();
  })
  .catch((error) => {
    console.error("Error fetching service config:", error);
  });
