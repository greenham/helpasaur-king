import express, { Request, Response, Router } from "express"
import guard from "express-jwt-permissions"
import User from "../../models/user"
import { IUserDocument } from "../../types/models"
import { AuthenticatedRequest } from "../../types/express"
import { getRequestedChannel, getTwitchApiClient } from "../../lib/utils"
import {
  sendSuccess,
  sendError,
  sendNoop,
  handleRouteError,
} from "../../lib/responseHelpers"
import { ALLOWED_COMMAND_PREFIXES } from "../../constants"
import { TwitchUserData } from "twitch-api-client"

const router: Router = express.Router()
const permissionGuard = guard()

// GET /channels -> returns list of channels currently auto-joined by the bot (admin-only)
router.get(
  "/channels",
  permissionGuard.check("admin"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const users = (await User.find({
        "twitchBotConfig.active": true,
      })) as IUserDocument[]
      const channels = users
        .filter((u) => u.twitchUserData?.login)
        .map((u) => u.twitchUserData!.login)
        .sort()
      sendSuccess(res, channels)
    } catch (err) {
      handleRouteError(res, err, "get channels")
    }
  }
)

// POST /join -> adds requested or logged-in user to join list for twitch bot
router.post("/join", async (req: AuthenticatedRequest, res: Response) => {
  let user: IUserDocument | null
  // check for a logged-in user requesting the bot to join the channel
  if (
    !req.user?.permissions?.includes("service") &&
    (!req.user?.permissions?.includes("admin") || !req.body.channel)
  ) {
    user = await User.findById(req.user?.sub)
    if (!user) {
      return sendError(res, "User not found", 404)
    }
    if (!user.twitchBotConfig) {
      user.twitchBotConfig = {}
    }
    user.twitchBotConfig.active = true
    user.markModified("twitchBotConfig")
    await user.save()
  } else {
    // otherwise, extract the requested channel from the service or admin request
    const requestedChannel = await getRequestedChannel(req)
    if (!requestedChannel) {
      return sendError(res, "Invalid channel provided", 400)
    }

    try {
      user = await User.findOne({
        "twitchUserData.login": requestedChannel,
      })
      if (user) {
        if (user.twitchBotConfig?.active) {
          return sendNoop(res, `Already joined ${requestedChannel}!`)
        }

        if (!user.twitchBotConfig) {
          user.twitchBotConfig = {}
        }
        user.twitchBotConfig.active = true
        user.markModified("twitchBotConfig")
        await user.save()
      } else {
        // Get user data from Twitch
        const twitchApiClient = getTwitchApiClient()

        let twitchUserData: TwitchUserData | null = null
        try {
          const response: TwitchUserData | null =
            await twitchApiClient.getUserByName(requestedChannel)
          if (!response) {
            throw new Error(
              `Unable to get user data for channel ${requestedChannel}`
            )
          }
          twitchUserData = response
        } catch (err) {
          console.error(
            `Error fetching user data for ${requestedChannel} from Twitch!`,
            err
          )
          return sendError(
            res,
            `Unable to fetch twitch user data for ${requestedChannel}!`
          )
        }

        try {
          // Create new user and set the twitch bot to active
          user = await User.create({
            twitchUserData,
            twitchBotConfig: { active: true },
          })
        } catch (err) {
          console.error(`Error creating new user for ${requestedChannel}!`, err)
          return sendError(
            res,
            `Unable to create new user for ${requestedChannel}!`
          )
        }
      }
    } catch (err) {
      return handleRouteError(res, err, "join channel")
    }
  }

  // tell the twitch bot to do the requested thing (unless this came from the twitch bot itself)
  if (
    !req.user?.permissions?.includes("service") ||
    req.user?.sub !== "twitch"
  ) {
    req.app.wsRelay.emit("joinChannel", {
      channel: user.twitchUserData?.login,
    })
  }

  sendSuccess(res, {
    twitchBotConfig: {
      roomId: user.twitchUserData?.id,
      ...user.twitchBotConfig,
    },
  })
})

// POST /leave -> removes requested or logged-in user from join list for twitch bot
router.post("/leave", async (req: AuthenticatedRequest, res: Response) => {
  const requestedChannel = await getRequestedChannel(req)
  if (!requestedChannel) {
    return sendError(res, "Invalid channel provided", 400)
  }

  try {
    const user = await User.findOne({
      "twitchUserData.login": requestedChannel,
    })
    if (!user) {
      return sendNoop(res, `Not in ${requestedChannel}!`)
    }

    if (user.twitchBotConfig) {
      user.twitchBotConfig.active = false
    }
    user.markModified("twitchBotConfig")
    await user.save()

    // tell the twitch bot to do the requested thing (unless this came from the twitch bot itself)
    if (
      !req.user?.permissions?.includes("service") ||
      req.user?.sub !== "twitch"
    ) {
      req.app.wsRelay.emit("leaveChannel", requestedChannel)
    }

    sendSuccess(res)
  } catch (err) {
    handleRouteError(res, err, "leave channel")
  }
})

// PATCH /config -> updates twitch bot configuration for a channel
router.patch("/config", async (req: AuthenticatedRequest, res: Response) => {
  const requestedChannel = await getRequestedChannel(req)
  if (!requestedChannel) {
    return sendError(res, "Invalid channel provided", 400)
  }

  // Validate that only allowed config fields are being updated
  const allowedFields = [
    "commandsEnabled",
    "commandPrefix",
    "textCommandCooldown",
    "practiceListsEnabled",
    "allowModsToManagePracticeLists",
    "weeklyRaceAlertEnabled",
  ]

  const updates: Record<string, unknown> = {}
  for (const field of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(req.body, field)) {
      const value = req.body[field]

      // Validate commandPrefix if provided
      if (field === "commandPrefix") {
        if (typeof value !== "string" || value.length !== 1) {
          return sendError(
            res,
            "Command prefix must be exactly one character",
            400
          )
        }
        if (
          !ALLOWED_COMMAND_PREFIXES.includes(
            value as (typeof ALLOWED_COMMAND_PREFIXES)[number]
          )
        ) {
          return sendError(
            res,
            `Invalid command prefix. Allowed: ${ALLOWED_COMMAND_PREFIXES.join(", ")}`,
            400
          )
        }
      }

      updates[`twitchBotConfig.${field}`] = value
    }
  }

  if (Object.keys(updates).length === 0) {
    return sendError(res, "No valid fields to update", 400)
  }

  try {
    const user = await User.findOne({
      "twitchUserData.login": requestedChannel,
    })

    if (!user) {
      return sendError(res, `User ${requestedChannel} not found`, 404)
    }

    // Apply updates
    for (const [path, value] of Object.entries(updates)) {
      const keys = path.split(".")
      let current: Record<string, unknown> = user as unknown as Record<
        string,
        unknown
      >
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]] as Record<string, unknown>
      }
      current[keys[keys.length - 1]] = value
    }

    if (user.twitchBotConfig) {
      user.twitchBotConfig.lastUpdated = new Date()
    }
    user.markModified("twitchBotConfig")
    await user.save()

    // Emit configuration update event to the twitch bot
    if (
      !req.user?.permissions?.includes("service") ||
      req.user?.sub !== "twitch"
    ) {
      if (user.twitchUserData) {
        req.app.wsRelay.emit("configUpdate", {
          roomId: user.twitchUserData.id,
          channelName: user.twitchUserData.login,
          displayName: user.twitchUserData.display_name,
          ...user.twitchBotConfig,
        })
      }
    }

    sendSuccess(res, {
      twitchBotConfig: {
        roomId: user.twitchUserData?.id,
        ...user.twitchBotConfig,
      },
    })
  } catch (err) {
    handleRouteError(res, err, "update config")
  }
})

export default router
