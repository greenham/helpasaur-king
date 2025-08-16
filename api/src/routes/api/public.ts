import express, { Request, Response, Router } from "express"
import { ALLOWED_COMMAND_PREFIXES } from "../../constants"

const router: Router = express.Router()

// GET /configs -> returns all public constants and configuration options
router.get("/configs", async (_req: Request, res: Response) => {
  res.status(200).json({
    twitch: {
      commandPrefixes: ALLOWED_COMMAND_PREFIXES,
    },
    // Future constants can be added here
    // discord: { ... },
    // general: { ... },
  })
})

export default router
