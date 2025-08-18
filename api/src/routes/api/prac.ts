import express, { Request, Response, Router } from "express"
import guard from "express-jwt-permissions"
import PracLists from "../../models/pracLists"
import { requireJwtToken } from "../../lib/utils"
import {
  sendSuccess,
  sendError,
  handleRouteError,
} from "../../lib/responseHelpers"

const router: Router = express.Router()
const permissionGuard = guard()

// Endpoint: /prac

// ======== PROTECTED ENDPOINTS ========
// POST /:twitchUserId/lists/:listName/entries
// Adds a new entry to the practice list
router.post(
  "/:twitchUserId/lists/:listName/entries",
  requireJwtToken,
  permissionGuard.check("service"),
  async (req: Request, res: Response) => {
    const twitchUserId = req.params.twitchUserId ?? false
    if (!twitchUserId) {
      return sendError(res, "Missing twitchUserId!", 400)
    }

    const listName = req.params.listName ?? "default"

    // @TODO sanitize and validate the entry (char limit, etc.)
    const entry = req.body.entry.trim() ?? false
    if (!entry) {
      return sendError(res, "Missing entry!", 400)
    }

    try {
      const result = await PracLists.findOne({
        twitchUserId,
        name: listName,
      })

      // @TODO: Convert this to an actual ID that stays consistent for the lifetime of the entry?
      let newId
      if (result) {
        // user has a list already, append to it
        result.entries.push(entry)
        result.markModified("entries")
        await result.save()
        newId = result.entries.length
      } else {
        // user does not have a list, create one
        const newList = new PracLists({
          twitchUserId,
          name: listName,
          entries: [entry],
        })
        await newList.save()
        newId = 1
      }

      sendSuccess(
        res,
        { newId },
        `Added entry #${newId} to ${listName} practice list.`,
        201
      )
    } catch (err: any) {
      handleRouteError(res, err, "add practice list entry")
    }
  }
)

// Gets a random entry from the practice list
router.get(
  "/:twitchUserId/lists/:listName/entries/random",
  requireJwtToken,
  permissionGuard.check("service"),
  async (req: Request, res: Response) => {
    const twitchUserId = req.params.twitchUserId ?? false
    if (!twitchUserId) {
      return sendError(res, "Missing twitchUserId!", 400)
    }

    const listName = req.params.listName ?? "default"

    try {
      const result = await PracLists.findOne({
        twitchUserId,
        name: listName,
      })
      if (!result || result.entries.length === 0) {
        return sendError(res, `${listName} practice list is empty!`, 404)
      }
      const randomIndex = Math.floor(Math.random() * result.entries.length)
      const randomEntry = result.entries[randomIndex]
      sendSuccess(
        res,
        {
          id: randomIndex,
          entry: randomEntry,
        },
        `Practice this: ${randomEntry} [${randomIndex + 1}]`
      )
    } catch (err: any) {
      handleRouteError(res, err, "get random practice list entry")
    }
  }
)

// Deletes a specifc entry from the practice list
router.delete(
  "/:twitchUserId/lists/:listName/entries/:entryId",
  requireJwtToken,
  permissionGuard.check("service"),
  async (req: Request, res: Response) => {
    const twitchUserId = req.params.twitchUserId ?? false
    if (!twitchUserId) {
      return sendError(res, "Missing twitchUserId!", 400)
    }

    const listName = req.params.listName ?? "default"

    try {
      const result = await PracLists.findOne({
        twitchUserId,
        name: listName,
      })
      if (!result) {
        return sendError(res, "No practice list found!", 404)
      }
      const entryId = parseInt(req.params.entryId)
      if (entryId < 1 || entryId > result.entries.length) {
        return sendError(res, "Invalid entry ID!", 400)
      }
      result.entries.splice(entryId - 1, 1)
      result.markModified("entries")
      await result.save()
      sendSuccess(
        res,
        null,
        `Deleted entry #${entryId} from ${listName} practice list!`
      )
    } catch (err: any) {
      handleRouteError(res, err, "delete practice list entry")
    }
  }
)

// Gets the entire practice list
router.get(
  "/:twitchUserId/lists/:listName",
  requireJwtToken,
  permissionGuard.check("service"),
  async (req: Request, res: Response) => {
    const twitchUserId = req.params.twitchUserId ?? false
    if (!twitchUserId) {
      return sendError(res, "Missing twitchUserId!", 400)
    }

    const listName = req.params.listName ?? "default"

    try {
      const result = await PracLists.findOne({
        twitchUserId,
        name: listName,
      })
      if (!result) {
        return sendError(res, "No practice list found!", 404)
      }
      sendSuccess(
        res,
        {
          entries: result.entries,
        },
        result.entries.map((e, idx) => `[${idx + 1}] ${e}`).join(" | ")
      )
    } catch (err: any) {
      handleRouteError(res, err, "get practice list")
    }
  }
)

// Clears the entire practice list
router.delete(
  "/:twitchUserId/lists/:listName",
  requireJwtToken,
  permissionGuard.check("service"),
  async (req: Request, res: Response) => {
    const twitchUserId = req.params.twitchUserId ?? false
    if (!twitchUserId) {
      return sendError(res, "Missing twitchUserId!", 400)
    }

    const listName = req.params.listName ?? "default"

    try {
      const result = await PracLists.deleteOne({
        twitchUserId,
        name: listName,
      })

      if (!result) {
        return sendError(res, "No matching practice list found!", 404)
      }

      sendSuccess(res, null, "Practice list cleared!")
    } catch (err: any) {
      handleRouteError(res, err, "clear practice list")
    }
  }
)

export default router
