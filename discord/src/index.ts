import { HelpaApi } from "helpa-api-client"
import { DiscordBot } from "./bot"
import express, { Request, Response } from "express"
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

    const bot = new DiscordBot(config as any, helpaApiClient)

    // Listen for ready event to track bot status
    bot.discordClient.once("ready", () => {
      // Start health check server after bot is ready
      const healthApp = express()
      const healthPort = Number(process.env.DISCORD_HEALTH_PORT) || 3010

      healthApp.get("/health", (_req: Request, res: Response) => {
        try {
          res.status(200).json({
            status: "healthy",
            service: "discord",
            version: packageJson.version,
            connected: bot.discordClient.ws.status === 0,
            uptime: bot.discordClient.uptime
              ? ms(bot.discordClient.uptime, { long: true })
              : "0 ms",
            uptimeMs: bot.discordClient.uptime, // keep raw ms for monitoring tools
            ping: bot.discordClient.ws.ping
              ? `${bot.discordClient.ws.ping}ms`
              : "N/A",
            guilds: bot.discordClient.guilds.cache.size, // number of servers
            users: bot.discordClient.users.cache.size, // cached users
            channels: bot.discordClient.channels.cache.size, // cached channels
            commands: bot.discordClient.commands?.size || 0, // registered commands
            readyAt: bot.discordClient.readyAt, // timestamp when bot became ready
            environment: process.env.NODE_ENV || "development",
          })
        } catch (error: any) {
          res.status(503).json({
            status: "unhealthy",
            error: error.message,
          })
        }
      })

      healthApp.listen(healthPort, () => {
        console.log(`Health check endpoint available on port ${healthPort}`)
      })
    })

    bot.start()
  })
  .catch((error) => {
    console.error("Error fetching service config:", error)
  })