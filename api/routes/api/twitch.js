const express = require("express");
const router = express.Router();
const Config = require("../../models/config");

// Endpoint: /twitch

// POST /join -> adds requested user to join list for twitch bot
router.post("/join", async (req, res) => {
  try {
    const twitchConfig = await Config.findOne({ id: "twitch" });
    if (twitchConfig.config.channels.includes(req.body.channel)) {
      return res.status(200).json({ noop: true });
    }

    twitchConfig.config.channels.push(req.body.channel);
    await twitchConfig.save();

    res.status(200).json({ result: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /leave -> removes requested user from join list for twitch bot
router.post("/leave", async (req, res) => {
  try {
    const twitchConfig = await Config.findOne({ id: "twitch" });
    if (!twitchConfig.config.channels.includes(req.body.channel)) {
      return res.status(200).json({ noop: true });
    }

    twitchConfig.config.channels = twitchConfig.config.channels.filter(
      (c) => c !== req.body.channel
    );
    await twitchConfig.save();

    res.status(200).json({ result: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
