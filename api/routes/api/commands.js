const express = require("express");
const router = express.Router();
const Command = require("../../models/command");

// Endpoint: /commands

// GET / -> returns all commands
router.get("/", async (req, res) => {
  try {
    const commands = await Command.find({ deleted: { $ne: true } });
    res.status(200).json(commands);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /:id -> returns command by ID
router.get("/:id", async (req, res) => {
  try {
    const command = await Command.findById(req.params.id);
    res.status(200).json(command);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /find -> find command by name or alias
router.post("/find", async (req, res) => {
  try {
    const command = await Command.findOne({
      $or: [{ command: req.body.command }, { aliases: req.body.command }],
      deleted: { $ne: true },
    });
    res.status(200).json(command);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /:id -> "delete" command by ID
router.delete("/:id", async (req, res) => {
  try {
    const command = await Command.findById(req.params.id);
    res.status(200).json(command);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
