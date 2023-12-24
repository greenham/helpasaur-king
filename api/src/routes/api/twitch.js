const express = require("express");
const router = express.Router();
const Config = require("../../models/config");
const { getRequestedChannel } = require("../../lib/utils");
const guard = require("express-jwt-permissions")();

// GET /channels -> returns list of channels currently auto-joined by the bot (admin-only)
router.get("/channels", guard.check("admin"), async (req, res) => {
  try {
    const twitchConfig = await Config.findOne({ id: "twitch" });
    // Put in alphabetical order before returning
    twitchConfig.config.channels.sort();
    res.status(200).json(twitchConfig.config.channels);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /join -> adds requested or logged-in user to join list for twitch bot
router.post("/join", async (req, res) => {
  const requestedChannel = await getRequestedChannel(req);
  if (!requestedChannel) {
    return res.status(400).json({ message: "Invalid channel provided" });
  }

  try {
    const twitchConfig = await Config.findOne({ id: "twitch" });
    if (twitchConfig.config.channels.includes(requestedChannel)) {
      return res.status(200).json({
        result: "noop",
        message: `Already joined ${requestedChannel}!`,
      });
    }

    twitchConfig.config.channels.push(requestedChannel);
    twitchConfig.markModified("config");
    await twitchConfig.save();

    // tell the twitch bot to do the requested thing (unless this came from the twitch bot itself)
    if (
      !req.user.permissions.includes("service") ||
      req.user.sub !== "twitch"
    ) {
      req.app.wsRelay.emit("joinChannel", requestedChannel);
    }

    res.status(200).json({ result: "success" });
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
      return res
        .status(200)
        .json({ result: "noop", message: `Not in ${requestedChannel}!` });
    }

    twitchConfig.config.channels = twitchConfig.config.channels.filter(
      (c) => c !== requestedChannel
    );
    twitchConfig.markModified("config");
    await twitchConfig.save();

    // tell the twitch bot to do the requested thing (unless this came from the twitch bot itself)
    if (
      !req.user.permissions.includes("service") ||
      req.user.sub !== "twitch"
    ) {
      req.app.wsRelay.emit("leaveChannel", requestedChannel);
    }

    res.status(200).json({ result: "success" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
