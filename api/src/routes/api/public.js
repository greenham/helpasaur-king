const express = require("express");
const router = express.Router();
const { ALLOWED_COMMAND_PREFIXES } = require("../../constants");

// GET /configs -> returns all public constants and configuration options
router.get("/configs", async (_req, res) => {
  res.status(200).json({
    twitch: {
      commandPrefixes: ALLOWED_COMMAND_PREFIXES,
    },
    // Future constants can be added here
    // discord: { ... },
    // general: { ... },
  });
});

module.exports = router;