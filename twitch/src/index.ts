import { HelpaApi } from "@helpasaur/api-client"
import { TwitchBot } from "./bot"
import express from "express"
import ms from "ms"
import { ServiceConfig, TwitchBotConfig } from "@helpasaur/types"

const packageJson = require("../package.json")

const helpaApiClient = new HelpaApi({
  apiHost: process.env.API_HOST!,
  apiKey: process.env.API_KEY!,
  serviceName: "twitch",
})

export const DEFAULT_COMMAND_PREFIX = "!"

async function init() {
  try {
    // Get service config
    const config = await helpaApiClient.getServiceConfig()
    if (!config) {
      throw new Error(`Unable to get service config from API!`)
    }

    // Cast the generic config to TwitchBotConfig
    const twitchConfig = config as TwitchBotConfig

    // Get the initial list of active channels the bot should join
    const response = await helpaApiClient
      .getAxiosInstance()
      .get("/api/configs/twitch/activeChannels")

    const channels = response.data
    const bot = new TwitchBot(twitchConfig, helpaApiClient, channels)
    bot.start()

    // Start health check server after bot starts
    const healthApp = express()
    const healthPort = process.env.TWITCH_HEALTH_PORT || 3011

    healthApp.get("/health", (_req: express.Request, res: express.Response) => {
      try {
        res.status(200).json({
          status: "healthy",
          service: "twitch",
          version: packageJson.version,
          channelCount: bot.channelList ? bot.channelList.length : 0,
          commandPrefix: bot.config?.cmdPrefix || DEFAULT_COMMAND_PREFIX,
          username: bot.config.username || "unknown",
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
    })

    healthApp.listen(healthPort, () => {
      console.log(`Health check endpoint available on port ${healthPort}`)
    })
  } catch (error: any) {
    console.error("🛑 Error starting Twitch bot:", error.message)
    process.exit(1)
  }
}

// Start the bot
init()
