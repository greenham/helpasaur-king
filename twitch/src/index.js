const { HelpaApi } = require("helpa-api-client");
const { TwitchBot } = require("./bot");
const express = require("express");

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

    // Get the initial list of active channels the bot should join
    helpaApiClient
      .api("/api/configs/twitch/activeChannels")
      .then((channels) => {
        bot.start(channels.data);
        
        // Start health check server after bot starts
        const healthApp = express();
        const healthPort = process.env.TWITCH_HEALTH_PORT || 3011;
        
        healthApp.get("/health", (req, res) => {
          res.status(200).json({ 
            status: "healthy", 
            service: "twitch",
            connected: bot.bot && bot.bot.readyState() === "OPEN",
            channels: bot.channelList ? bot.channelList.length : 0
          });
        });
        
        healthApp.listen(healthPort, () => {
          console.log(`Health check endpoint available on port ${healthPort}`);
        });
      })
      .catch((error) => {
        console.error("Error fetching active channels:", error);
      });
  })
  .catch((error) => {
    console.error("Error fetching service config:", error);
  });
