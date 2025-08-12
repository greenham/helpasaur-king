import { HelpaApi } from "helpa-api-client"
import { TwitchBot } from "./bot"
import express from "express"
import ms from "ms"
import { TwitchBotConfig } from "@helpasaur/types"

const packageJson = require("../package.json")

const helpaApiClient = new HelpaApi({
  apiHost: process.env.API_HOST,
  apiKey: process.env.API_KEY,
  serviceName: "twitch",
})

helpaApiClient
  .getServiceConfig()
  .then((config: TwitchBotConfig) => {
    if (!config) {
      throw new Error(`Unable to get service config from API!`)
    }

    const bot = new TwitchBot(config, helpaApiClient)

    // Get the initial list of active channels the bot should join
    helpaApiClient
      .getAxiosInstance()
      .get("/api/configs/twitch/activeChannels")
      .then((response) => {
        const channels = response.data
        bot.start(channels)

        // Start health check server after bot starts
        const healthApp = express()
        const healthPort = process.env.TWITCH_HEALTH_PORT || 3011

        healthApp.get(
          "/health",
          (_req: express.Request, res: express.Response) => {
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
            } catch (error: any) {
              console.error("Health check error:", error)
              res.status(503).json({
                status: "unhealthy",
                service: "twitch",
                error: error.message,
              })
            }
          }
        )

        healthApp.listen(healthPort, () => {
          console.log(`Health check endpoint available on port ${healthPort}`)
        })
      })
      .catch((error: any) => {
        console.error("Error fetching active channels:", error)
      })
  })
  .catch((error: any) => {
    console.error("Error fetching service config:", error)
  })
