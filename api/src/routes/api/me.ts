import express, { Request, Response, Router } from "express"
import User from "../../models/user"
import { sendSuccess, handleRouteError } from "../../lib/responseHelpers"

const router: Router = express.Router()

// User Endpoints (/api/me)

// GET /me
router.get("/", async (req: Request, res: Response) => {
  try {
    const user = await User.findById((req as any).user?.sub)
    sendSuccess(res, user)
  } catch (err) {
    handleRouteError(res, err, "get current user")
  }
})

// GET /me/twitch
router.get("/twitch", async (req: Request, res: Response) => {
  try {
    const user: any = await User.findById((req as any).user?.sub)
    sendSuccess(res, user.twitchBotConfig)
  } catch (err) {
    handleRouteError(res, err, "get user Twitch config")
  }
})

export default router
