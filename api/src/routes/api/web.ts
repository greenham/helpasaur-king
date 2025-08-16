import express, { Request, Response, Router } from "express"
import Config from "../../models/config"
import { ALLOWED_COMMAND_PREFIXES } from "../../constants"

const router: Router = express.Router()

// Endpoint: /web

// GET /config -> returns frontend configuration for web
router.get("/config", async (req: Request, res: Response) => {
  const { config: streamAlertsConfig }: any = await Config.findOne({
    id: "streamAlerts",
  })
  const { channels, statusFilters, blacklistedUsers } = streamAlertsConfig

  try {
    res.status(200).json({
      channels,
      statusFilters,
      blacklistedUsers,
      twitch: {
        commandPrefixes: ALLOWED_COMMAND_PREFIXES,
      },
    })
  } catch (err: any) {
    res.status(500).json({ message: err.message })
  }
})

export default router
