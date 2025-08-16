import express, { Request, Response, Router } from "express"
import guard from "express-jwt-permissions"
import { requireJwtToken } from "../../lib/utils"
import Config from "../../models/config"

const router: Router = express.Router()
const permissionGuard = guard()

// Endpoint: /discord

// GET /api/discord/joinUrl
// - Returns the URL to join the bot to a guild
router.get("/joinUrl", async (req: Request, res: Response) => {
  try {
    const discordConfig: any = await Config.findOne({ id: "discord" })
    res.status(200).json({
      result: "success",
      message: "OK",
      url: `https://discord.com/api/oauth2/authorize?client_id=${
        discordConfig.config.clientId
      }&permissions=${
        discordConfig.config.oauth.permissions
      }&scope=${discordConfig.config.oauth.scopes.join("%20")}`,
    })
  } catch (err: any) {
    res.status(500).json({ result: "error", message: err.message })
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
      const discordConfig: any = await Config.findOne({ id: "discord" })
      if (discordConfig.config.guilds.find((g: any) => g.id === req.body.id)) {
        return res.status(200).json({
          result: "noop",
          message: `Already joined guild: ${req.body.name} (${req.body.id})!`,
        })
      }

      discordConfig.config.guilds.push(req.body)
      discordConfig.markModified("config")
      await discordConfig.save()

      res.status(201).json({ result: "success", message: "OK" })
    } catch (err: any) {
      res.status(500).json({ result: "error", message: err.message })
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
      return res.status(400).json({
        result: "error",
        message: `Invalid guild id provided!`,
      })
    }

    try {
      // assume req.body contains a valid patch for a guild object
      // update this in config for discord (guilds array)
      const discordConfig: any = await Config.findOne({ id: "discord" })
      const index = discordConfig.config.guilds.findIndex(
        (g: any) => g.id === req.params.id
      )
      if (index === -1) {
        return res.status(404).json({
          result: "error",
          message: `Guild not found: ${req.params.id}`,
        })
      }

      discordConfig.config.guilds[index] = Object.assign(
        discordConfig.config.guilds[index],
        req.body
      )
      discordConfig.markModified("config")
      await discordConfig.save()

      res.status(200).json({ result: "success", message: "OK" })
    } catch (err: any) {
      res.status(500).json({ result: "error", message: err.message })
    }
  }
)

export default router
