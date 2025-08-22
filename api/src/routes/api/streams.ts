import express, { Request, Response, Router } from "express"
import { HelixPaginatedStreamFilter } from "twitch-api-client"
import Config from "../../models/config"
import { getTwitchApiClient } from "../../lib/utils"
import { sendSuccess, handleRouteError } from "../../lib/responseHelpers"

const router: Router = express.Router()

// Endpoint: /streams

// GET /live -> returns all live alttp streams
router.get("/live", async (req: Request, res: Response) => {
  const { config: streamAlertsConfig }: any = await Config.findOne({
    id: "streamAlerts",
  })
  const twitchApiClient = getTwitchApiClient()

  const filter: HelixPaginatedStreamFilter = {
    type: "live",
    limit: 100,
    game: streamAlertsConfig.alttpGameIds,
  }

  if (req.query.cursor) {
    filter.after = req.query.cursor as string
  }

  try {
    const streams = await twitchApiClient.getStreams(filter)
    sendSuccess(res, streams)
  } catch (err) {
    handleRouteError(res, err, "get live streams")
  }
})

export default router
