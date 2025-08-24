import express, { Request, Response, Router } from "express"
import guard from "express-jwt-permissions"
import { getTwitchApiClient } from "../../lib/utils"
import {
  sendSuccess,
  sendError,
  sendNoop,
  handleRouteError,
} from "../../lib/responseHelpers"
import { getConfig, getConfigWithDoc } from "../../types/config"
import {
  TwitchUserData,
  GetSubscriptionOptions,
  HelixEventSubSubscriptionStatus,
} from "twitch-api-client"
import { TwitchStreamEventType } from "@helpasaur/types"

const router: Router = express.Router()
const permissionGuard = guard()

// Endpoint: /streamAlerts

router.get(
  "/channels",
  permissionGuard.check("admin"),
  async (req: Request, res: Response) => {
    try {
      const streamAlertsConfig = await getConfig("streamAlerts")
      if (!streamAlertsConfig) {
        throw new Error("Stream alerts configuration not found")
      }
      // Put this list of strings in alphabetical order before returning
      streamAlertsConfig.channels.sort((a, b) => {
        if (a.login < b.login) {
          return -1
        }
        if (a.login > b.login) {
          return 1
        }
        return 0
      })
      sendSuccess(res, streamAlertsConfig.channels)
    } catch (err) {
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
    if (!Object.prototype.hasOwnProperty.call(req.body, "channels")) {
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

    const result = await getConfigWithDoc("streamAlerts")
    if (!result) {
      throw new Error("Stream alerts configuration not found")
    }
    const { config: streamAlertsConfig, doc: configDoc } = result
    const twitchApiClient = getTwitchApiClient()
    console.log(
      `Adding ${req.body.channels.length} channels to stream alerts...`
    )

    const results = req.body.channels.map(async (channel: string) => {
      // Ensure this isn't in the channel list already
      if (
        streamAlertsConfig.channels.find(
          (c) => c.login === channel.toLowerCase()
        ) !== undefined
      ) {
        return {
          status: "error",
          channel,
          message: `${channel} is already in the list!`,
        }
      }

      // Query Twitch API for the user info by their login name
      const userData: TwitchUserData | null =
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
          events: [
            TwitchStreamEventType.STREAM_ONLINE,
            TwitchStreamEventType.CHANNEL_UPDATE,
          ],
        }
      )

      streamAlertsConfig.channels.push(userData)
      configDoc.markModified("config")
      await configDoc.save()
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
      console.log(
        `Received request to remove ${req.params.id} from stream alerts`
      )

      const result = await getConfigWithDoc("streamAlerts")
      if (!result) {
        return sendError(res, "Configuration not found")
      }
      const { config: streamAlertsConfig, doc: configDoc } = result
      const channelIndex = streamAlertsConfig.channels.findIndex(
        (c) => c.id === req.params.id
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
        `Removing event subscriptions for ${streamAlertsConfig.channels[channelIndex].login}`
      )

      // Do a lookup to get event subscriptions for this user, then delete them one-by-one
      const subscriptions = await twitchApiClient.getSubscriptions({
        user_id: req.params.id,
      })
      if (subscriptions && subscriptions.length > 0) {
        subscriptions.forEach(async (subscription) => {
          await twitchApiClient.deleteSubscription(subscription.id)
          console.log(`Deleted subscription ${subscription.id}`)
        })
      }

      // Remove from list of channels in config
      console.log(`Removing from list...`)
      streamAlertsConfig.channels.splice(channelIndex, 1)
      configDoc.markModified("config")
      await configDoc.save()

      sendSuccess(res, undefined, "Channel removed from stream alerts")
    } catch (err) {
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
      // Build options from query params
      const options: GetSubscriptionOptions = {}
      if (req.query.status)
        options.status = req.query.status as HelixEventSubSubscriptionStatus
      if (req.query.type) options.type = req.query.type as string
      if (req.query.user_id) options.user_id = req.query.user_id as string

      const results = await twitchApiClient.getSubscriptions(
        Object.keys(options).length > 0 ? options : undefined
      )
      sendSuccess(res, results)
    } catch (err) {
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
    } catch (err) {
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
    if (!Object.prototype.hasOwnProperty.call(req.body, "channels")) {
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

    const result = await getConfigWithDoc("streamAlerts")
    if (!result) {
      throw new Error("Stream alerts configuration not found")
    }
    const { config: streamAlertsConfig, doc: configDoc } = result
    const twitchApiClient = getTwitchApiClient()
    console.log(
      `Blacklisting ${req.body.channels.length} channels from stream directory...`
    )

    const results = req.body.channels.map(async (channel: string) => {
      // Query Twitch API for the user info by their login name
      const userData: TwitchUserData | null =
        await twitchApiClient.getUserByName(channel)
      if (!userData) {
        return {
          status: "error",
          channel,
          message: `Unable to get user data for channel ${channel}`,
        }
      }

      // Ensure this user isn't in the blacklist already
      if (streamAlertsConfig.blacklistedUsers.includes(userData.id)) {
        return {
          status: "error",
          channel,
          message: `${channel} is already in the blacklist!`,
        }
      }

      streamAlertsConfig.blacklistedUsers.push(userData.id)
      configDoc.markModified("config")
      await configDoc.save()
      console.log(`Added ${channel} to blacklisted users`)

      return { success: true, channel }
    })

    Promise.allSettled(results).then(async (channelResults) => {
      sendSuccess(res, channelResults, "Channels added to blacklist")
    })
  }
)

export default router
