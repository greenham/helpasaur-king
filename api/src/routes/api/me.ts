import express, { Request, Response, Router } from "express"
import User from "../../models/user"

const router: Router = express.Router()

// User Endpoints (/api/me)

// GET /me
router.get("/", async (req: Request, res: Response) => {
  try {
    const user = await User.findById((req as any).user?.sub)
    res.status(200).json(user)
  } catch (err: any) {
    res.status(500).json({ message: err.message })
  }
})

// GET /me/twitch
router.get("/twitch", async (req: Request, res: Response) => {
  try {
    const user: any = await User.findById((req as any).user?.sub)
    res.status(200).json({ ...user.twitchBotConfig })
  } catch (err: any) {
    res.status(500).json({ message: err.message })
  }
})

export default router
