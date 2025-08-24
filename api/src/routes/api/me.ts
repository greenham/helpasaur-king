import express, { Response, Router } from "express"
import User from "../../models/user"
import { sendSuccess, handleRouteError } from "../../lib/responseHelpers"
import { AuthenticatedRequest } from "../../types/express"
import { IUserDocument } from "../../types/models"

const router: Router = express.Router()

// User Endpoints (/api/me)

// GET /me
router.get("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await User.findById(req.user?.sub)
    sendSuccess(res, user)
  } catch (err) {
    handleRouteError(res, err, "get current user")
  }
})

// GET /me/twitch
router.get("/twitch", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user: IUserDocument | null = await User.findById(req.user?.sub)
    sendSuccess(res, user?.twitchBotConfig)
  } catch (err) {
    handleRouteError(res, err, "get user Twitch config")
  }
})

export default router
