import express, { Request, Response, Router } from "express"
import Config from "../../models/config"
import { ALLOWED_COMMAND_PREFIXES } from "../../constants"
import { sendSuccess, handleRouteError } from "../../lib/responseHelpers"
import { isStreamAlertsConfig } from "../../types/config"

const router: Router = express.Router()

// Endpoint: /web

// GET /config -> returns frontend configuration for web
router.get("/config", async (req: Request, res: Response) => {
  try {
    const configDoc = await Config.findOne({ id: "streamAlerts" })
    if (!configDoc || !isStreamAlertsConfig(configDoc)) {
      throw new Error("Stream alerts configuration not found")
    }
    const streamAlertsConfig = configDoc.config
    const { channels, statusFilters, blacklistedUsers } = streamAlertsConfig

    const webConfig = {
      streams: {
        channels,
        statusFilters,
        blacklistedUsers,
      },
      twitch: {
        commandPrefixes: ALLOWED_COMMAND_PREFIXES,
      },
    }

    sendSuccess(res, webConfig)
  } catch (err) {
    handleRouteError(res, err, "get web config")
  }
})

export default router
