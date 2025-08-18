import express, { Request, Response, Router } from "express"
import guard from "express-jwt-permissions"
import Config from "../../models/config"
import { getTwitchApiClient } from "../../lib/utils"
import {
  sendSuccess,
  sendError,
  sendNoop,
  handleRouteError,
} from "../../lib/responseHelpers"
import { HelixUser } from "twitch-api-client"

const router: Router = express.Router()
const permissionGuard = guard()

// Endpoint: /streamAlerts

router.get(
  "/channels",
  permissionGuard.check("admin"),
  async (req: Request, res: Response) => {
    try {
      const streamAlertsConfig: any = await Config.findOne({
        id: "streamAlerts",
      })
      // Put this list of strings in alphabetical order before returning
      streamAlertsConfig.config.channels.sort((a: any, b: any) => {
        if (a.login < b.login) {
          return -1
        }
        if (a.login > b.login) {
          return 1
        }
        return 0
      })
      sendSuccess(res, streamAlertsConfig.config.channels)
    } catch (err: any) {
      handleRouteError(res, err, "get stream alerts channels")
    }
  }
)

// POST /channels
//
//  Request Body:
//    { channels: Array<String> }
//
//  Adds new channels to stream alerts list and subscribes to necessary Twitch events
router.post(
  "/channels",
  permissionGuard.check("admin"),
  async (req: Request, res: Response) => {
    if (Object.prototype.hasOwnProperty.call(req.body, "channels")) {
      return sendError(
        res,
        "Missing payload property 'channels' (Array<String>)",
        400
      )
    }

    if (!Array.isArray(req.body.channels)) {
      return sendError(res, "'channels' must be an Array of usernames", 400)
    }

    if (req.body.channels.length === 0) {
      return sendError(res, "No channels provided in Array", 400)
    }

    const streamAlertsConfig: any = await Config.findOne({ id: "streamAlerts" })
    const twitchApiClient = getTwitchApiClient()
    console.log(
      `Adding ${req.body.channels.length} channels to stream alerts...`
    )

    const results = req.body.channels.map(async (channel: string) => {
      // Ensure this isn't in the channel list already
      if (
        streamAlertsConfig.config.channels.find(
          (c: any) => c.login === channel.toLowerCase()
        ) !== undefined
      ) {
        return {
          status: "error",
          channel,
          message: `${channel} is already in the list!`,
        }
      }

      // Query Twitch API for the user info by their login name
      const userData: HelixUser | null =
        await twitchApiClient.getUserByName(channel)

      if (!userData) {
        return {
          status: "error",
          channel,
          message: `Unable to get user data for channel ${channel}`,
        }
      }

      const subscriptionResults = await twitchApiClient.subscribeToStreamEvents(
        {
          channel,
          userId: userData.id,
        }
      )

      streamAlertsConfig.config.channels.push(userData)
      streamAlertsConfig.markModified("config")
      await streamAlertsConfig.save()
      console.log(`Added ${channel} to stream alerts list`)

      return { status: "success", channel, subscriptionResults }
    })

    Promise.allSettled(results).then(async (channelResults) => {
      sendSuccess(res, channelResults, "Channels added to stream alerts")
    })
  }
)

// DELETE /channels/:id -> remove channel by user ID, delete event subscriptions for that user ID
router.delete(
  "/channels/:id",
  permissionGuard.check("admin"),
  async (req: Request, res: Response) => {
    try {
      const streamAlertsConfig = await Config.findOne({ id: "streamAlerts" })
      console.log(
        `Received request to remove ${req.params.id} from stream alerts`
      )

      // Ensure this channel is in the list already
      if (!streamAlertsConfig || !streamAlertsConfig.config) {
        return sendError(res, "Configuration not found")
      }
      const channelIndex = streamAlertsConfig.config.channels.findIndex(
        (c: any) => c.id === req.params.id
      )
      if (channelIndex === undefined) {
        console.log(`${req.params.id} is not in the stream alerts list!`)
        return sendNoop(
          res,
          `${req.params.id} is not in the stream alerts list!`
        )
      }

      // Delete event subscriptions
      const twitchApiClient = getTwitchApiClient()
      console.log(
        `Removing event subscriptions for ${streamAlertsConfig.config.channels[channelIndex].login}`
      )

      // Do a lookup to get event subscriptions for this user, then delete them one-by-one
      const subscriptions = await twitchApiClient.getSubscriptions({
        user_id: req.params.id,
      })
      if (subscriptions && subscriptions.length > 0) {
        subscriptions.forEach(async (subscription: any) => {
          await twitchApiClient.deleteSubscription(subscription.id)
          console.log(`Deleted subscription ${subscription.id}`)
        })
      }

      // Remove from list of channels in config
      console.log(`Removing from list...`)
      streamAlertsConfig.config.channels.splice(channelIndex, 1)
      streamAlertsConfig.markModified("config")
      await streamAlertsConfig.save()

      sendSuccess(res, undefined, "Channel removed from stream alerts")
    } catch (err: any) {
      handleRouteError(res, err, "remove channel from stream alerts")
    }
  }
)

// GET /subscriptions -> get list of webhook subscriptions
router.get(
  "/subscriptions",
  permissionGuard.check("admin"),
  async (req: Request, res: Response) => {
    try {
      const twitchApiClient = getTwitchApiClient()
      const results = await twitchApiClient.getSubscriptions(req.query)
      sendSuccess(res, results)
    } catch (err: any) {
      handleRouteError(res, err, "get subscriptions")
    }
  }
)

router.delete(
  "/subscriptions/all",
  permissionGuard.check("admin"),
  async (req: Request, res: Response) => {
    const twitchApiClient = getTwitchApiClient()
    try {
      const results = await twitchApiClient.clearSubscriptions()
      sendSuccess(res, results)
    } catch (err: any) {
      console.error("error from clearSubscriptions")
      handleRouteError(res, err, "clear subscriptions")
    }
  }
)

// @TODO DRY this out into something that can do basic list management / user querying
router.post(
  "/channels/blacklist",
  permissionGuard.check("admin"),
  async (req: Request, res: Response) => {
    if (Object.prototype.hasOwnProperty.call(req.body, "channels")) {
      return sendError(
        res,
        "Missing payload property 'channels' (Array<String>)",
        400
      )
    }

    if (!Array.isArray(req.body.channels)) {
      return sendError(res, "'channels' must be an Array of usernames", 400)
    }

    if (req.body.channels.length === 0) {
      return sendError(res, "No channels provided in Array", 400)
    }

    const streamAlertsConfig: any = await Config.findOne({ id: "streamAlerts" })
    const twitchApiClient = getTwitchApiClient()
    console.log(
      `Blacklisting ${req.body.channels.length} channels from stream directory...`
    )

    const results = req.body.channels.map(async (channel: string) => {
      // Query Twitch API for the user info by their login name
      const userData: HelixUser | null =
        await twitchApiClient.getUserByName(channel)
      if (!userData) {
        return {
          status: "error",
          channel,
          message: `Unable to get user data for channel ${channel}`,
        }
      }

      // Ensure this user isn't in the blacklist already
      if (streamAlertsConfig.config.blacklistedUsers.includes(userData.id)) {
        return {
          status: "error",
          channel,
          message: `${channel} is already in the blacklist!`,
        }
      }

      streamAlertsConfig.config.blacklistedUsers.push(userData.id)
      streamAlertsConfig.markModified("config")
      await streamAlertsConfig.save()
      console.log(`Added ${channel} to blacklisted users`)

      return { success: true, channel }
    })

    Promise.allSettled(results).then(async (channelResults) => {
      sendSuccess(res, channelResults, "Channels added to blacklist")
    })
  }
)

export default router
