import express, { Request, Response, Router } from "express"
import Config from "../../models/config"
import User from "../../models/user"
import {
  sendSuccess,
  sendError,
  handleRouteError,
} from "../../lib/responseHelpers"

const router: Router = express.Router()

// Endpoint: /config

// GET / -> returns all configs
router.get("/", async (req: Request, res: Response) => {
  try {
    const configs = await Config.find()
    sendSuccess(res, configs)
  } catch (err: any) {
    handleRouteError(res, err, "get configs")
  }
})

// GET /:id -> returns config for id
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const result = await Config.findOne({ id: req.params.id })
    sendSuccess(res, result)
  } catch (err: any) {
    handleRouteError(res, err, "get config by ID")
  }
})

// GET /twitch/activeChannels -> returns active channels to be joined by the Twitch bot
router.get("/twitch/activeChannels", async (req: Request, res: Response) => {
  if ((req as any).user?.sub !== "twitch") {
    return sendError(res, "Unauthorized", 401)
  }

  try {
    const users = await User.find({ "twitchBotConfig.active": true })
    const channels = users.map((u: any) =>
      Object.assign(
        {
          roomId: u.twitchUserData.id,
          channelName: u.twitchUserData.login,
          displayName: u.twitchUserData.display_name,
        },
        u.twitchBotConfig
      )
    )
    sendSuccess(res, channels)
  } catch (err: any) {
    handleRouteError(res, err, "get active channels")
  }
})

export default router
