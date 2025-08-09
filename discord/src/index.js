const { HelpaApi } = require("helpa-api-client");
const { DiscordBot } = require("./bot");
const express = require("express");

const helpaApiClient = new HelpaApi({
  apiHost: process.env.API_HOST,
  apiKey: process.env.API_KEY,
  serviceName: process.env.SERVICE_NAME,
});

// Track bot connection status
let botReady = false;

helpaApiClient
  .getServiceConfig()
  .then((config) => {
    if (!config) {
      throw new Error(`Unable to get service config from API!`);
    }

    const bot = new DiscordBot(config, helpaApiClient);
    
    // Listen for ready event to track bot status
    bot.discordClient.once("ready", () => {
      botReady = true;
      
      // Start health check server after bot is ready
      const healthApp = express();
      const healthPort = process.env.DISCORD_HEALTH_PORT || 3010;
      
      healthApp.get("/health", (req, res) => {
        res.status(200).json({ 
          status: "healthy", 
          service: "discord",
          connected: bot.discordClient.ws.status === 0
        });
      });
      
      healthApp.listen(healthPort, () => {
        console.log(`Health check endpoint available on port ${healthPort}`);
      });
    });
    
    bot.start();
  })
  .catch((error) => {
    console.error("Error fetching service config:", error);
  });
