const express = require("express");
const router = express.Router();
const guard = require("express-jwt-permissions")();
const { requireJwtToken } = require("../../lib/utils");
const Config = require("../../models/config");

// Endpoint: /discord

// GET /api/discord/joinUrl
router.get("/joinUrl", async (req, res) => {
  try {
    const discordConfig = await Config.findOne({ id: "discord" });
    res.status(200).json({
      result: "success",
      message: "OK",
      url: `https://discord.com/api/oauth2/authorize?client_id=${
        discordConfig.config.clientId
      }&permissions=${
        discordConfig.config.oauth.permissions
      }&scope=${discordConfig.config.oauth.scopes.join("%20")}`,
    });
  } catch (err) {
    res.status(500).json({ result: "error", message: err.message });
  }
});

// POST /api/discord/guildCreate
router.post(
  "/guildCreate",
  requireJwtToken,
  guard.check(["service"]),
  async (req, res) => {
    try {
      // assume req.body contains a valid guild object
      // add this to config for discord (guilds array)
      const discordConfig = await Config.findOne({ id: "discord" });
      if (discordConfig.config.guilds.find((g) => g.id === req.body.id)) {
        return res.status(200).json({
          result: "noop",
          message: `Already joined guild: ${req.body.name} (${req.body.id})!`,
        });
      }

      discordConfig.config.guilds.push(req.body);
      discordConfig.markModified("config");
      await discordConfig.save();

      res.status(200).json({ result: "success", message: "OK" });
    } catch (err) {
      res.status(500).json({ result: "error", message: err.message });
    }
  }
);

router.patch(
  "/guild/:id",
  requireJwtToken,
  guard.check(["service"]),
  async (req, res) => {
    try {
      // assume req.body contains a valid patch for a guild object
      // update this in config for discord (guilds array)
      const discordConfig = await Config.findOne({ id: "discord" });
      const index = discordConfig.config.guilds.findIndex(
        (g) => g.id === req.params.id
      );
      if (index === -1) {
        return res.status(404).json({
          result: "error",
          message: `Guild not found: ${req.params.id}`,
        });
      }

      discordConfig.config.guilds[index] = Object.assign(
        discordConfig.config.guilds[index],
        req.body
      );
      discordConfig.markModified("config");
      await discordConfig.save();

      res.status(200).json({ result: "success", message: "OK" });
    } catch (err) {
      res.status(500).json({ result: "error", message: err.message });
    }
  }
);

module.exports = router;
