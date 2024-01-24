const { HelpaApi } = require("helpa-api-client");
const { TwitchBot } = require("./bot");

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

    const bot = new TwitchBot(config, helpaApiClient);

    // Get the list of active channels the bot should join
    helpaApiClient
      .api("/api/configs/twitch/activeChannels")
      .then((channels) => {
        bot.start(channels.data);
        // @TODO: Re-fetch this on an interval?
      })
      .catch((error) => {
        console.error("Error fetching active channels:", error);
      });
  })
  .catch((error) => {
    console.error("Error fetching service config:", error);
  });
