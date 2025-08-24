import express, { Request, Response, Router } from "express"
import { ALLOWED_COMMAND_PREFIXES } from "../../constants"
import { sendSuccess, handleRouteError } from "../../lib/responseHelpers"
import { getConfig } from "../../types/config"

const router: Router = express.Router()

// Endpoint: /web

// GET /config -> returns frontend configuration for web
router.get("/config", async (req: Request, res: Response) => {
  try {
    const streamAlertsConfig = await getConfig("streamAlerts")
    if (!streamAlertsConfig) {
      throw new Error("Stream alerts configuration not found")
    }
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
      // @TODO: Move these into the database and make them editable
      resources: [
        {
          href: "https://alttp-wiki.net/index.php/Main_Page",
          target: "_blank",
          rel: "noopener noreferrer",
          icon: "fa-solid fa-arrow-up-right-from-square",
          text: "Speedrun Wiki",
        },
        {
          href: "https://spannerisms.github.io/lttphack/",
          target: "_blank",
          rel: "noopener noreferrer",
          icon: "fa-solid fa-arrow-up-right-from-square",
          text: "Practice Hack",
        },
        {
          href: "https://strats.alttp.run/",
          target: "_blank",
          rel: "noopener noreferrer",
          icon: "fa-solid fa-arrow-up-right-from-square",
          text: "Strat Hub",
        },
        {
          href: "http://www.speedrun.com/alttp",
          target: "_blank",
          rel: "noopener noreferrer",
          icon: "fa-solid fa-arrow-up-right-from-square",
          text: "Leaderboards",
        },
        {
          divider: true,
        },
        {
          href: "https://discord.gg/8cskCK4",
          target: "_blank",
          rel: "noopener noreferrer",
          icon: "fa-brands fa-discord",
          text: "ALttP Discord",
        },
      ],
    }

    sendSuccess(res, webConfig)
  } catch (err) {
    handleRouteError(res, err, "get web config")
  }
})

export default router
