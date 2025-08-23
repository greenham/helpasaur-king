import express, { Router } from "express"
import guard from "express-jwt-permissions"
import { requireJwtToken } from "../../lib/utils"
import commandsRoutes from "./commands"
import streamsRoutes from "./streams"
import webRoutes from "./web"
import meRoutes from "./me"
import twitchRoutes from "./twitch"
import discordRoutes from "./discord"
import streamAlertsRoutes from "./stream-alerts"
import configsRoutes from "./configs"
import pracRoutes from "./prac"
import testEventsRoutes from "./test-events"

const router: Router = express.Router()
const permissionGuard = guard()

router.use(express.json())

// Public Endpoints
router.use("/commands", commandsRoutes)
router.use("/streams", streamsRoutes)
router.use("/web", webRoutes)

// Authorized Endpoints
router.use("/me", requireJwtToken, meRoutes)
router.use("/twitch", requireJwtToken, twitchRoutes)
router.use("/discord", discordRoutes)
router.use(
  "/streamAlerts",
  requireJwtToken,
  permissionGuard.check([["admin"], ["service"]]),
  streamAlertsRoutes
)
router.use(
  "/configs",
  requireJwtToken,
  permissionGuard.check([["admin"], ["service"]]),
  configsRoutes
)
router.use("/prac", pracRoutes)
router.use(
  "/testEvents",
  requireJwtToken,
  permissionGuard.check([["admin"]]),
  testEventsRoutes
)

export default router
