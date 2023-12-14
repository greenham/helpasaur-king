const express = require("express");
const router = express.Router();
const Config = require("../../models/config");
const { getRequestedChannel } = require("../../lib/utils");

// POST /join -> adds requested or logged-in user to join list for twitch bot
router.post("/join", async (req, res) => {
  const requestedChannel = await getRequestedChannel(req);
  if (!requestedChannel) {
    return res.status(400).json({ message: "Invalid channel provided" });
  }

  try {
    const twitchConfig = await Config.findOne({ id: "twitch" });
    console.log(`Received join add for ${requestedChannel}`);
    if (twitchConfig.config.channels.includes(requestedChannel)) {
      return res.status(200).json({ noop: true });
    }

    twitchConfig.config.channels.push(requestedChannel);
    twitchConfig.markModified("config");
    await twitchConfig.save();

    // tell the twitch bot to do the requested thing (unless this came from the twitch bot itself)
    if (req.auth.entity !== "service" || req.auth.sub !== "twitch") {
      req.app.wsRelay.emit("joinChannel", requestedChannel);
    }

    res.status(200).json({ result: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /leave -> removes requested or logged-in user from join list for twitch bot
router.post("/leave", async (req, res) => {
  const requestedChannel = await getRequestedChannel(req);
  if (!requestedChannel) {
    return res.status(400).json({ message: "Invalid channel provided" });
  }

  try {
    const twitchConfig = await Config.findOne({ id: "twitch" });
    if (!twitchConfig.config.channels.includes(requestedChannel)) {
      return res.status(200).json({ noop: true });
    }

    twitchConfig.config.channels = twitchConfig.config.channels.filter(
      (c) => c !== requestedChannel
    );
    twitchConfig.markModified("config");
    await twitchConfig.save();

    // tell the twitch bot to do the requested thing (unless this came from the twitch bot itself)
    if (req.auth.entity !== "service" || req.auth.sub !== "twitch") {
      req.app.wsRelay.emit("leaveChannel", requestedChannel);
    }

    res.status(200).json({ result: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
