import { HelpaApi } from "helpa-api-client"
import { TwitchBot } from "./bot"
import express from "express"
import ms from "ms"
import * as packageJson from "../package.json"

const helpaApiClient = new HelpaApi({
  apiHost: process.env.API_HOST || "",
  apiKey: process.env.API_KEY || "",
  serviceName: process.env.SERVICE_NAME || "",
})

helpaApiClient
  .getServiceConfig()
  .then((config) => {
    if (!config) {
      throw new Error(`Unable to get service config from API!`)
    }

    const bot = new TwitchBot(config as any, helpaApiClient)

    // Get the initial list of active channels the bot should join
    helpaApiClient
      .getAxiosInstance()
      .get("/api/configs/twitch/activeChannels")
      .then((response) => {
        bot.start(response.data)

        // Start health check server after bot starts
        const healthApp = express()
        const healthPort = Number(process.env.TWITCH_HEALTH_PORT) || 3011

        healthApp.get("/health", (_req, res) => {
          try {
            const connectionState = (bot.bot as any)?.readyState?.() || "CLOSED"
            const uptimeMs = (bot.bot as any)?._connectTimestamp
              ? Date.now() - (bot.bot as any)._connectTimestamp
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
              commandPrefix: (config as any)?.cmdPrefix || "!",
              username: (config as any)?.username || "unknown", // bot's public username is ok
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
      })
      .catch((error) => {
        console.error("Error fetching active channels:", error)
      })
  })
  .catch((error) => {
    console.error("Error fetching service config:", error)
  })
