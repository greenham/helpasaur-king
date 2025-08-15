import express, { Request, Response, Router } from "express"
import TwitchApi from "../../lib/twitch-api"
import Config from "../../models/config"

const router: Router = express.Router()

const getStreamAlertsConfig = async () => {
  return await Config.findOne({ id: "streamAlerts" })
}

// Endpoint: /streams

// GET /live -> returns all live alttp streams
router.get("/live", async (req: Request, res: Response) => {
  const { config: streamAlertsConfig }: any = await getStreamAlertsConfig()
  const twitchApiClient = new TwitchApi({
    client_id: streamAlertsConfig.clientId,
    client_secret: streamAlertsConfig.clientSecret,
  })

  let filter: any = {
    type: "live",
    first: 100,
    game_id: streamAlertsConfig.alttpGameIds,
  }

  if (req.query.cursor) {
    filter.cursor = req.query.cursor
  }

  try {
    const streams = await twitchApiClient.getStreams(filter)
    res.status(200).json(streams.data)
  } catch (err: any) {
    res.status(500).json({ message: err.message })
  }
})

export default router
