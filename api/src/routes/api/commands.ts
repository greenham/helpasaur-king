import express, { Request, Response, Router } from "express"
import Command from "../../models/command"
import CommandLog from "../../models/commandLog"
import { requireJwtToken } from "../../lib/utils"
import {
  sendSuccess,
  sendError,
  handleRouteError,
} from "../../lib/responseHelpers"
import guard from "express-jwt-permissions"

interface MatchFilter {
  createdAt?: {
    $gte: Date
  }
  source?: string
}

const router: Router = express.Router()
const permissionGuard = guard()

// Endpoint: /commands

// ======== PUBLIC ENDPOINTS ========
// GET / -> returns all active commands
router.get("/", async (req: Request, res: Response) => {
  try {
    const commands = await Command.find({ deleted: { $ne: true } })
    sendSuccess(res, commands)
  } catch (err) {
    handleRouteError(res, err, "get commands")
  }
})

// GET /:id -> returns command by ID
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const command = await Command.findById(req.params.id)
    sendSuccess(res, command)
  } catch (err) {
    handleRouteError(res, err, "get command by ID")
  }
})

// POST /find -> find command by name or alias
router.post("/find", async (req: Request, res: Response) => {
  try {
    const command = await Command.findByNameOrAlias(req.body.command)
    sendSuccess(res, command)
  } catch (err) {
    handleRouteError(res, err, "find command")
  }
})

// ======== PROTECTED ENDPOINTS ========
// POST / -> create new command
router.post(
  "/",
  requireJwtToken,
  permissionGuard.check("admin"),
  async (req: Request, res: Response) => {
    try {
      delete req.body._id

      // Check for validation errors before uniqueness check
      if (!req.body.command || !req.body.command.trim()) {
        return sendError(res, "Command name is required", 400)
      }
      if (!req.body.response || !req.body.response.trim()) {
        return sendError(res, "Command response is required", 400)
      }

      // Ensure command name and alias uniqueness
      const isUnique = await Command.isUnique(
        req.body.command,
        req.body.aliases
      )
      if (!isUnique) {
        return sendError(
          res,
          "The command name or one of the aliases provided is already in use!",
          409
        )
      }

      const command = await Command.create(req.body)
      sendSuccess(res, command, "Command created successfully", 201)
    } catch (err) {
      // Handle MongoDB validation errors
      if (
        err &&
        typeof err === "object" &&
        "name" in err &&
        err.name === "ValidationError" &&
        "errors" in err
      ) {
        interface ValidationError {
          path: string
          message: string
        }
        const mongoErr = err as { errors: Record<string, ValidationError> }
        const validationErrors = Object.values(mongoErr.errors).map((error) => {
          if (error.path === "command") {
            return "Command name is required"
          }
          if (error.path === "response") {
            return "Command response is required"
          }
          return error.message
        })
        return sendError(res, validationErrors.join(", "), 400)
      }
      handleRouteError(res, err, "create command")
    }
  }
)

// PATCH /:id -> update command
router.patch(
  "/:id",
  requireJwtToken,
  permissionGuard.check("admin"),
  async (req: Request, res: Response) => {
    try {
      const command = await Command.findById(req.params.id)
      if (!command) {
        return sendError(res, "Command not found", 404)
      }

      // Check for validation errors before updating
      if (
        req.body.command !== undefined &&
        (!req.body.command || !req.body.command.trim())
      ) {
        return sendError(res, "Command name is required", 400)
      }
      if (
        req.body.response !== undefined &&
        (!req.body.response || !req.body.response.trim())
      ) {
        return sendError(res, "Command response is required", 400)
      }

      for (const key in req.body) {
        ;(command as unknown as Record<string, unknown>)[key] = req.body[key]
      }
      await command.save()

      sendSuccess(res, command, "Command updated successfully")
    } catch (err) {
      // Handle MongoDB validation errors
      if (
        err &&
        typeof err === "object" &&
        "name" in err &&
        err.name === "ValidationError" &&
        "errors" in err
      ) {
        interface ValidationError {
          path: string
          message: string
        }
        const mongoErr = err as { errors: Record<string, ValidationError> }
        const validationErrors = Object.values(mongoErr.errors).map((error) => {
          if (error.path === "command") {
            return "Command name is required"
          }
          if (error.path === "response") {
            return "Command response is required"
          }
          return error.message
        })
        return sendError(res, validationErrors.join(", "), 400)
      }
      handleRouteError(res, err, "update command")
    }
  }
)

// DELETE /:id -> "delete" command by ID
router.delete(
  "/:id",
  requireJwtToken,
  permissionGuard.check("admin"),
  async (req: Request, res: Response) => {
    try {
      // @TODO: Make this a soft delete?
      await Command.deleteOne({ _id: req.params.id })
      sendSuccess(res, undefined, "Command deleted successfully")
    } catch (err) {
      handleRouteError(res, err, "delete command")
    }
  }
)

// services only
router.post(
  "/logs",
  requireJwtToken,
  permissionGuard.check("service"),
  async (req: Request, res: Response) => {
    try {
      await CommandLog.create(req.body)
      sendSuccess(res, undefined, "Command usage logged")
    } catch (err) {
      handleRouteError(res, err, "log command usage")
    }
  }
)

// ======== STATS ENDPOINTS (Admin Only) ========

// Helper function to get date filter based on time range
const getDateFilter = (timeRange?: string) => {
  if (!timeRange || timeRange === "all") return {}

  const now = new Date()
  const startDate = new Date()

  switch (timeRange) {
    case "24h":
      startDate.setHours(now.getHours() - 24)
      break
    case "7d":
      startDate.setDate(now.getDate() - 7)
      break
    case "30d":
      startDate.setDate(now.getDate() - 30)
      break
    case "90d":
      startDate.setDate(now.getDate() - 90)
      break
    default:
      return {}
  }

  return { createdAt: { $gte: startDate } }
}

// GET /stats/overview -> overall statistics
router.get(
  "/stats/overview",
  requireJwtToken,
  permissionGuard.check("admin"),
  async (req: Request, res: Response) => {
    try {
      const timeRange = req.query.timeRange as string
      const dateFilter = getDateFilter(timeRange)

      const [totalUsage, uniqueUsers, uniqueCommands, platformBreakdown] =
        await Promise.all([
          CommandLog.countDocuments(dateFilter),
          CommandLog.distinct("username", dateFilter),
          CommandLog.distinct("command", dateFilter),
          CommandLog.aggregate([
            { $match: dateFilter },
            { $group: { _id: "$source", count: { $sum: 1 } } },
          ]),
        ])

      const platformStats = {
        discord: 0,
        twitch: 0,
      }

      platformBreakdown.forEach((item: { _id: string; count: number }) => {
        if (item._id === "discord" || item._id === "twitch") {
          platformStats[item._id] = item.count
        }
      })

      sendSuccess(res, {
        totalUsage,
        uniqueUsers: uniqueUsers.length,
        uniqueCommands: uniqueCommands.length,
        platformBreakdown: platformStats,
      })
    } catch (err) {
      handleRouteError(res, err, "get command stats overview")
    }
  }
)

// GET /stats/top-commands -> most used commands
router.get(
  "/stats/top-commands",
  requireJwtToken,
  permissionGuard.check("admin"),
  async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10
      const timeRange = req.query.timeRange as string
      const dateFilter = getDateFilter(timeRange)

      const topCommands = await CommandLog.aggregate([
        { $match: { ...dateFilter, command: { $ne: "commands" } } },
        { $group: { _id: "$command", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: limit },
        { $project: { command: "$_id", count: 1, _id: 0 } },
      ])

      // Calculate percentages
      const total = await CommandLog.countDocuments(dateFilter)
      const commandsWithPercentage = topCommands.map((cmd) => ({
        ...cmd,
        percentage: total > 0 ? ((cmd.count / total) * 100).toFixed(1) : "0",
      }))

      sendSuccess(res, commandsWithPercentage)
    } catch (err) {
      handleRouteError(res, err, "get top commands")
    }
  }
)

// GET /stats/platform-breakdown -> detailed platform stats
router.get(
  "/stats/platform-breakdown",
  requireJwtToken,
  permissionGuard.check("admin"),
  async (req: Request, res: Response) => {
    try {
      const timeRange = req.query.timeRange as string
      const dateFilter = getDateFilter(timeRange)

      const breakdown = await CommandLog.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: "$source",
            count: { $sum: 1 },
            uniqueUsers: { $addToSet: "$username" },
            uniqueCommands: { $addToSet: "$command" },
          },
        },
        {
          $project: {
            platform: "$_id",
            count: 1,
            uniqueUsers: { $size: "$uniqueUsers" },
            uniqueCommands: { $size: "$uniqueCommands" },
            _id: 0,
          },
        },
        {
          $sort: { platform: 1 }, // Sort alphabetically: discord, twitch
        },
      ])

      sendSuccess(res, breakdown)
    } catch (err) {
      handleRouteError(res, err, "get platform breakdown")
    }
  }
)

// GET /stats/top-users -> users who use commands most
router.get(
  "/stats/top-users",
  requireJwtToken,
  permissionGuard.check("admin"),
  async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10
      const timeRange = req.query.timeRange as string
      const dateFilter = getDateFilter(timeRange)

      const topUsers = await CommandLog.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: { username: "$username", source: "$source" },
            count: { $sum: 1 },
            commands: { $addToSet: "$command" },
          },
        },
        { $sort: { count: -1 } },
        { $limit: limit },
        {
          $project: {
            username: "$_id.username",
            platform: "$_id.source",
            count: 1,
            uniqueCommands: { $size: "$commands" },
            _id: 0,
          },
        },
      ])

      sendSuccess(res, topUsers)
    } catch (err) {
      handleRouteError(res, err, "get top users")
    }
  }
)

// GET /stats/timeline -> usage over time
router.get(
  "/stats/timeline",
  requireJwtToken,
  permissionGuard.check("admin"),
  async (req: Request, res: Response) => {
    try {
      const timeRange = (req.query.timeRange as string) || "7d"
      const interval = (req.query.interval as string) || "day"
      const dateFilter = getDateFilter(timeRange)

      // Determine date format based on interval
      let dateFormat: Record<string, unknown>
      switch (interval) {
        case "hour":
          dateFormat = {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            day: { $dayOfMonth: "$createdAt" },
            hour: { $hour: "$createdAt" },
          }
          break
        case "day":
        default:
          dateFormat = {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            day: { $dayOfMonth: "$createdAt" },
          }
          break
      }

      const timeline = await CommandLog.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: {
              date: dateFormat,
              source: "$source",
            },
            count: { $sum: 1 },
          },
        },
        {
          $group: {
            _id: "$_id.date",
            platforms: {
              $push: {
                source: "$_id.source",
                count: "$count",
              },
            },
            total: { $sum: "$count" },
          },
        },
        {
          $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1, "_id.hour": 1 },
        },
        {
          $project: {
            date: "$_id",
            discord: {
              $reduce: {
                input: "$platforms",
                initialValue: 0,
                in: {
                  $cond: [
                    { $eq: ["$$this.source", "discord"] },
                    "$$this.count",
                    "$$value",
                  ],
                },
              },
            },
            twitch: {
              $reduce: {
                input: "$platforms",
                initialValue: 0,
                in: {
                  $cond: [
                    { $eq: ["$$this.source", "twitch"] },
                    "$$this.count",
                    "$$value",
                  ],
                },
              },
            },
            total: 1,
            _id: 0,
          },
        },
      ])

      // Format dates for display
      const formattedTimeline = timeline.map((item) => {
        const d = item.date
        const dateStr =
          interval === "hour"
            ? `${d.month}/${d.day} ${String(d.hour).padStart(2, "0")}:00`
            : `${d.month}/${d.day}`

        return {
          date: dateStr,
          discord: item.discord,
          twitch: item.twitch,
          total: item.total,
        }
      })

      sendSuccess(res, formattedTimeline)
    } catch (err) {
      handleRouteError(res, err, "get command timeline")
    }
  }
)

// GET /stats/recent -> recent command usage
router.get(
  "/stats/recent",
  requireJwtToken,
  permissionGuard.check("admin"),
  async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1
      const limit = parseInt(req.query.limit as string) || 20
      const skip = (page - 1) * limit

      const [logs, total] = await Promise.all([
        CommandLog.find()
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        CommandLog.countDocuments(),
      ])

      sendSuccess(res, {
        logs,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      })
    } catch (err) {
      handleRouteError(res, err, "get recent command logs")
    }
  }
)

// GET /stats/top-channels -> top Twitch channels/Discord guilds by command usage
router.get(
  "/stats/top-channels",
  requireJwtToken,
  permissionGuard.check("admin"),
  async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10
      const timeRange = req.query.timeRange as string
      const platform = req.query.platform as string // 'discord', 'twitch', or undefined for both
      const dateFilter = getDateFilter(timeRange)

      // Build match filter
      const matchFilter: MatchFilter = { ...dateFilter }
      if (platform) {
        matchFilter.source = platform
      }

      const topChannels = await CommandLog.aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id: {
              channel: {
                $cond: {
                  if: { $eq: ["$source", "discord"] },
                  then: "$metadata.guild",
                  else: {
                    $ltrim: {
                      input: "$metadata.channel",
                      chars: "#",
                    },
                  },
                },
              },
              source: "$source",
            },
            count: { $sum: 1 },
            uniqueUsers: { $addToSet: "$username" },
            uniqueCommands: { $addToSet: "$command" },
            lastUsed: { $max: "$createdAt" },
          },
        },
        { $sort: { count: -1 } },
        { $limit: limit },
        {
          $project: {
            channel: "$_id.channel",
            platform: "$_id.source",
            count: 1,
            uniqueUsers: { $size: "$uniqueUsers" },
            uniqueCommands: { $size: "$uniqueCommands" },
            lastUsed: 1,
            _id: 0,
          },
        },
      ])

      // Calculate percentages
      const total = topChannels.reduce((sum, ch) => sum + ch.count, 0)
      const channelsWithPercentage = topChannels.map((ch) => ({
        ...ch,
        percentage: total > 0 ? ((ch.count / total) * 100).toFixed(1) : "0",
      }))

      sendSuccess(res, channelsWithPercentage)
    } catch (err) {
      handleRouteError(res, err, "get top channels")
    }
  }
)

// ======== TAGS ENDPOINTS ========

// GET /tags - returns all unique tags in use
router.get("/tags", async (req: Request, res: Response) => {
  try {
    const tags = await Command.distinct("tags", {
      deleted: { $ne: true },
      tags: { $exists: true, $ne: [] },
    })

    sendSuccess(res, tags.sort())
  } catch (err) {
    handleRouteError(res, err, "get tags")
  }
})

// GET /tags/stats - returns tag usage statistics
router.get("/tags/stats", async (req: Request, res: Response) => {
  try {
    const tagStats = await Command.aggregate([
      {
        $match: {
          deleted: { $ne: true },
          enabled: { $ne: false },
          tags: { $exists: true, $ne: [] },
        },
      },
      {
        $unwind: "$tags",
      },
      {
        $group: {
          _id: "$tags",
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
      {
        $project: {
          tag: "$_id",
          count: 1,
          _id: 0,
        },
      },
    ])

    sendSuccess(res, tagStats)
  } catch (err) {
    handleRouteError(res, err, "get tag stats")
  }
})

// GET /untagged-count - returns count of commands without tags
router.get("/untagged-count", async (req: Request, res: Response) => {
  try {
    const untaggedCount = await Command.countDocuments({
      deleted: { $ne: true },
      enabled: { $ne: false },
      $or: [
        { tags: { $exists: false } },
        { tags: { $size: 0 } },
        { tags: null },
      ],
    })

    sendSuccess(res, untaggedCount)
  } catch (err) {
    handleRouteError(res, err, "get untagged count")
  }
})

export default router
