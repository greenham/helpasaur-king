const { HelpaApi } = require("helpa-api-client")
const { TwitchBot } = require("./bot")
const express = require("express")
const ms = require("ms")
const packageJson = require("../package.json")

const helpaApiClient = new HelpaApi({
  apiHost: process.env.API_HOST,
  apiKey: process.env.API_KEY,
  serviceName: process.env.SERVICE_NAME,
})

helpaApiClient
  .getServiceConfig()
  .then((config) => {
    if (!config) {
      throw new Error(`Unable to get service config from API!`)
    }

    const bot = new TwitchBot(config, helpaApiClient)

    // Get the initial list of active channels the bot should join
    helpaApiClient
      .api("/api/configs/twitch/activeChannels")
      .then((channels) => {
        bot.start(channels.data)

        // Start health check server after bot starts
        const healthApp = express()
        const healthPort = process.env.TWITCH_HEALTH_PORT || 3011

        healthApp.get("/health", (_req, res) => {
          try {
            const connectionState = bot.bot?.readyState() || "CLOSED"
            const uptimeMs = bot.bot?._connectTimestamp
              ? Date.now() - bot.bot._connectTimestamp
              : 0
            res.status(200).json({
              status: "healthy",
              service: "twitch",
              version: packageJson.version,
              connected: connectionState === "OPEN",
              connectionState: connectionState,
              channelCount: bot.channelList ? bot.channelList.length : 0, // just the count, not names
              uptime: uptimeMs ? ms(uptimeMs, { long: true }) : "0 ms",
              uptimeMs: uptimeMs, // keep raw ms for monitoring tools
              commandPrefix: bot.config?.cmdPrefix || "!",
              username: bot.config?.username || "unknown", // bot's public username is ok
              environment: process.env.NODE_ENV || "development",
            })
          } catch (error) {
            console.error("Health check error:", error)
            res.status(503).json({
              status: "unhealthy",
              service: "twitch",
              error: error.message,
            })
          }
        })

        healthApp.listen(healthPort, () => {
          console.log(`Health check endpoint available on port ${healthPort}`)
        })
      })
      .catch((error) => {
        console.error("Error fetching active channels:", error)
      })
  })
  .catch((error) => {
    console.error("Error fetching service config:", error)
  })
