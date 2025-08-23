import express from "express"
import { HelpaApi, ServiceName } from "@helpasaur/api-client"
import { TwitchBotServiceConfig } from "./types"
import { TwitchBot } from "./bot"
import { config } from "./config"

const {
  apiHost,
  apiKey,
  serviceName,
  twitchHealthPort,
  packageVersion,
  nodeEnv,
} = config

const helpaApiClient = new HelpaApi({
  apiHost,
  apiKey,
  serviceName: serviceName as ServiceName,
})

export const DEFAULT_COMMAND_PREFIX = "!"

async function init() {
  try {
    // Get service config
    const config = await helpaApiClient.getServiceConfig()
    if (!config || !config.config) {
      throw new Error(`Invalid service config fetched from API!`)
    }

    const twitchConfig = config.config as unknown as TwitchBotServiceConfig

    // Get the initial list of active channels the bot should join
    const activeChannels = await helpaApiClient.twitch.getActiveChannels()

    // Start the bot
    const bot = new TwitchBot(twitchConfig, helpaApiClient, activeChannels)
    bot.start()

    // Start health check server
    const healthApp = express()

    healthApp.get("/health", (_req: express.Request, res: express.Response) => {
      try {
        const currentChannels = bot.getActiveChannelsList()
        res.status(200).json({
          status: "healthy",
          service: "twitch",
          version: packageVersion,
          channelCount: currentChannels ? currentChannels.length : 0,
          commandPrefix: bot.config?.cmdPrefix || DEFAULT_COMMAND_PREFIX,
          username: bot.config.username || "unknown",
          environment: nodeEnv,
        })
      } catch (error) {
        console.error("Health check error:", error)
        res.status(503).json({
          status: "unhealthy",
          service: "twitch",
          error: error instanceof Error ? error.message : "Unknown error",
        })
      }
    })

    healthApp.listen(twitchHealthPort, () => {
      console.log(`Health check endpoint available on port ${twitchHealthPort}`)
    })
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error"
    console.error("🛑 Error starting Twitch bot:", errorMessage)
    process.exit(1)
  }
}

// Start the bot
init()
