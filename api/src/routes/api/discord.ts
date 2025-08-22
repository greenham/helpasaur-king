import express, { Request, Response, Router } from "express"
import guard from "express-jwt-permissions"
import { requireJwtToken } from "../../lib/utils"
import {
  sendSuccess,
  sendError,
  sendNoop,
  handleRouteError,
} from "../../lib/responseHelpers"
import Config from "../../models/config"
import { GuildConfig } from "@helpasaur/types"
import { DiscordServiceConfig, isDiscordConfig } from "../../types/config"

const router: Router = express.Router()
const permissionGuard = guard()

// Endpoint: /discord

// GET /api/discord/joinUrl
// - Returns the URL to join the bot to a guild
router.get("/joinUrl", async (req: Request, res: Response) => {
  try {
    const discordConfig = await Config.findOne({ id: "discord" })
    if (!discordConfig || !isDiscordConfig(discordConfig)) {
      throw new Error("Discord configuration not found")
    }
    const joinUrl = `https://discord.com/api/oauth2/authorize?client_id=${
      discordConfig.config.clientId
    }&permissions=${
      discordConfig.config.oauth.permissions
    }&scope=${discordConfig.config.oauth.scopes.join("%20")}`

    sendSuccess(res, { url: joinUrl })
  } catch (err) {
    handleRouteError(res, err, "get Discord join URL")
  }
})

// POST /api/discord/guild
// - Creates a new guild
router.post(
  "/guild",
  requireJwtToken,
  permissionGuard.check(["service"]),
  async (req: Request, res: Response) => {
    try {
      // assume req.body contains a valid guild object
      // add this to config for discord (guilds array)
      const discordConfig = await Config.findOne({ id: "discord" })
      if (!discordConfig || !isDiscordConfig(discordConfig)) {
        throw new Error("Discord configuration not found")
      }
      if (
        discordConfig.config.guilds.find(
          (g: GuildConfig) => g.id === req.body.id
        )
      ) {
        return sendNoop(
          res,
          `Already joined guild: ${req.body.name} (${req.body.id})!`
        )
      }

      discordConfig.config.guilds.push(req.body)
      discordConfig.markModified("config")
      await discordConfig.save()

      sendSuccess(res, null, "OK", 201)
    } catch (err) {
      handleRouteError(res, err, "create guild")
    }
  }
)

// PATCH /api/discord/guild/:id
// - Updates an existing guild
router.patch(
  "/guild/:id",
  requireJwtToken,
  permissionGuard.check(["service"]),
  async (req: Request, res: Response) => {
    if (!req.params.id || !req.params.id.match(/\d+/)) {
      return sendError(res, "Invalid guild id provided!", 400)
    }

    try {
      // assume req.body contains a valid patch for a guild object
      // update this in config for discord (guilds array)
      const discordConfig = await Config.findOne({ id: "discord" })
      if (!discordConfig || !isDiscordConfig(discordConfig)) {
        throw new Error("Discord configuration not found")
      }
      const index = discordConfig.config.guilds.findIndex(
        (g: GuildConfig) => g.id === req.params.id
      )
      if (index === -1) {
        return sendError(res, `Guild not found: ${req.params.id}`, 404)
      }

      discordConfig.config.guilds[index] = Object.assign(
        discordConfig.config.guilds[index],
        req.body
      )
      discordConfig.markModified("config")
      await discordConfig.save()

      sendSuccess(res, null, "OK")
    } catch (err) {
      handleRouteError(res, err, "update guild")
    }
  }
)

export default router
