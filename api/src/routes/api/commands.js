const express = require("express")
const router = express.Router()
const Command = require("../../models/command")
const CommandLog = require("../../models/commandLog")
const { requireJwtToken } = require("../../lib/utils")
const guard = require("express-jwt-permissions")()

// Endpoint: /commands

// ======== PUBLIC ENDPOINTS ========
// GET / -> returns all active commands
router.get("/", async (req, res) => {
  try {
    const commands = await Command.find({ deleted: { $ne: true } })
    res.status(200).json(commands)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// GET /:id -> returns command by ID
router.get("/:id", async (req, res) => {
  try {
    const command = await Command.findById(req.params.id)
    res.status(200).json(command)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// POST /find -> find command by name or alias
router.post("/find", async (req, res) => {
  try {
    const command = await Command.findByNameOrAlias(req.body.command)
    res.status(200).json(command)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// ======== PROTECTED ENDPOINTS ========
// POST / -> create new command
router.post("/", requireJwtToken, guard.check("admin"), async (req, res) => {
  try {
    delete req.body._id

    // Ensure command name and alias uniqueness
    const isUnique = await Command.isUnique(req.body.command, req.body.aliases)
    if (!isUnique) {
      return res.status(409).json({
        message: `The command name or one of the aliases provided is already in use!`,
      })
    }

    const command = await Command.create(req.body)
    res.status(201).json(command)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// PATCH /:id -> update command
router.patch(
  "/:id",
  requireJwtToken,
  guard.check("admin"),
  async (req, res) => {
    try {
      const command = await Command.findById(req.params.id)
      if (!command) {
        return res.sendStatus(404)
      }

      for (key in req.body) {
        command[key] = req.body[key]
      }
      await command.save()

      res.status(200).json(command)
    } catch (err) {
      res.status(500).json({ message: err.message })
    }
  }
)

// DELETE /:id -> "delete" command by ID
router.delete(
  "/:id",
  requireJwtToken,
  guard.check("admin"),
  async (req, res) => {
    try {
      // @TODO: Make this a soft delete?
      const command = await Command.deleteOne({ _id: req.params.id })
      res.status(200).json(command)
    } catch (err) {
      res.status(500).json({ message: err.message })
    }
  }
)

// services only
router.post(
  "/logs",
  requireJwtToken,
  guard.check("service"),
  async (req, res) => {
    try {
      const commandLog = await CommandLog.create(req.body)
      res.status(200).json(commandLog)
    } catch (err) {
      res.status(500).json({ message: err.message })
    }
  }
)

module.exports = router
