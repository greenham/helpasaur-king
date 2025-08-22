import express, { Request, Response, Router } from "express"
import Config from "../../models/config"
import User from "../../models/user"
import { IUserDocument } from "../../types/models"
import { AuthenticatedRequest } from "../../types/express"
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
  } catch (err) {
    handleRouteError(res, err, "get configs")
  }
})

// GET /:id -> returns config for id
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const result = await Config.findOne({ id: req.params.id })
    sendSuccess(res, result)
  } catch (err) {
    handleRouteError(res, err, "get config by ID")
  }
})

// GET /twitch/activeChannels -> returns active channels to be joined by the Twitch bot
router.get(
  "/twitch/activeChannels",
  async (req: AuthenticatedRequest, res: Response) => {
    if (req.user?.sub !== "twitch") {
      return sendError(res, "Unauthorized", 401)
    }

    try {
      const users = (await User.find({
        "twitchBotConfig.active": true,
        "twitchUserData.id": { $exists: true },
        "twitchUserData.login": { $exists: true },
        "twitchUserData.display_name": { $exists: true },
      })) as IUserDocument[]

      const channels = users
        .map((u) => {
          // TypeScript now knows these fields exist due to our query
          const { id, login, display_name } = u.twitchUserData || {}
          if (!id || !login || !display_name) {
            // This should never happen due to our query, but satisfies TypeScript
            return null
          }

          return Object.assign(
            {
              roomId: id,
              channelName: login,
              displayName: display_name,
            },
            u.twitchBotConfig
          )
        })
        .filter(Boolean)
      sendSuccess(res, channels)
    } catch (err) {
      handleRouteError(res, err, "get active channels")
    }
  }
)

export default router
