import express, { Request, Response, Router } from "express"
import guard from "express-jwt-permissions"
import PracLists from "../../models/pracLists"
import { requireJwtToken } from "../../lib/utils"

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
      res.status(400).json({ message: "Missing twitchUserId!" })
      return
    }

    const listName = req.params.listName ?? "default"

    // @TODO sanitize and validate the entry (char limit, etc.)
    const entry = req.body.entry.trim() ?? false
    if (!entry) {
      res.status(400).json({ message: "Missing entry!" })
      return
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

      res.status(201).json({
        message: `Added entry #${newId} to ${listName} practice list.`,
      })
    } catch (err: any) {
      res.status(500).json({ message: err.message })
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
      res.status(400).json({ message: "Missing twitchUserId!" })
      return
    }

    const listName = req.params.listName ?? "default"

    // check query params for exclude
    const exclude = req.query.exclude ?? false

    try {
      const result = await PracLists.findOne({
        twitchUserId,
        name: listName,
      })
      if (!result || result.entries.length === 0) {
        res.status(404).json({ message: `${listName} practice list is empty!` })
        return
      }
      const randomIndex = Math.floor(Math.random() * result.entries.length)
      const randomEntry = result.entries[randomIndex]
      res.status(200).json({
        message: `Practice this: ${randomEntry} [${randomIndex + 1}]`,
        id: randomIndex,
        entry: randomEntry,
      })
    } catch (err: any) {
      res.status(500).json({ message: err.message })
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
      res.status(400).json({ message: "Missing twitchUserId!" })
      return
    }

    const listName = req.params.listName ?? "default"

    try {
      const result = await PracLists.findOne({
        twitchUserId,
        name: listName,
      })
      if (!result) {
        res.status(404).json({ message: "No practice list found!" })
        return
      }
      const entryId = parseInt(req.params.entryId)
      if (entryId < 1 || entryId > result.entries.length) {
        res.status(400).json({ message: "Invalid entry ID!" })
        return
      }
      result.entries.splice(entryId - 1, 1)
      result.markModified("entries")
      await result.save()
      res.status(200).json({
        message: `Deleted entry #${entryId} from ${listName} practice list!`,
      })
    } catch (err: any) {
      res.status(500).json({ message: err.message })
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
      res.status(400).json({ message: "Missing twitchUserId!" })
      return
    }

    const listName = req.params.listName ?? "default"

    try {
      const result = await PracLists.findOne({
        twitchUserId,
        name: listName,
      })
      if (!result) {
        res.status(404).json({ message: "No practice list found!" })
        return
      }
      res.status(200).json({
        entries: result.entries,
        message: result.entries
          .map((e, idx) => `[${idx + 1}] ${e}`)
          .join(" | "),
      })
    } catch (err: any) {
      res.status(500).json({ message: err.message })
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
      res.status(400).json({ message: "Missing twitchUserId!" })
      return
    }

    const listName = req.params.listName ?? "default"

    try {
      const result = await PracLists.deleteOne({
        twitchUserId,
        name: listName,
      })

      if (!result) {
        res.status(404).json({ message: "No matching practice list found!" })
        return
      }

      res.status(200).json({ message: `Practice list cleared!` })
    } catch (err: any) {
      res.status(500).json({ message: err.message })
    }
  }
)

export default router
