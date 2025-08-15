import express, { Request, Response, Router } from "express"
import { HelixPaginatedStreamFilter } from "twitch-api-client"
import Config from "../../models/config"
import { getTwitchApiClient } from "../../lib/utils"

const router: Router = express.Router()

const getStreamAlertsConfig = async () => {
  return await Config.findOne({ id: "streamAlerts" })
}

// Endpoint: /streams

// GET /live -> returns all live alttp streams
router.get("/live", async (req: Request, res: Response) => {
  const { config: streamAlertsConfig }: any = await getStreamAlertsConfig()
  const twitchApiClient = getTwitchApiClient()

  let filter: HelixPaginatedStreamFilter = {
    type: "live",
    limit: 100,
    game: streamAlertsConfig.alttpGameIds,
  }

  if (req.query.cursor) {
    filter.after = req.query.cursor as string
  }

  try {
    const streams = await twitchApiClient.getStreams(filter)
    res.status(200).json(streams)
  } catch (err: any) {
    res.status(500).json({ message: err.message })
  }
})

export default router
