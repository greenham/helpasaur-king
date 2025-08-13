import express, { Request, Response, Router } from "express"
import Config from "../../models/config"

const router: Router = express.Router()

const getStreamAlertsConfig = async () => {
  return await Config.findOne({ id: "streamAlerts" })
}

// Endpoint: /web

// GET /config -> returns frontend configuration for web
router.get("/config", async (req: Request, res: Response) => {
  const { config: streamAlertsConfig }: any = await getStreamAlertsConfig()
  const { channels, statusFilters, blacklistedUsers } = streamAlertsConfig

  try {
    res.status(200).json({ channels, statusFilters, blacklistedUsers })
  } catch (err: any) {
    res.status(500).json({ message: err.message })
  }
})

export default router
