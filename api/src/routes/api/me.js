const express = require("express");
const router = express.Router();
const User = require("../../models/user");
const Config = require("../../models/config");

// User Endpoints (/api/me)

// GET /me
router.get("/", async (req, res) => {
  try {
    const user = await User.findById(req.auth.sub);
    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /me/twitch
router.get("/twitch", async (req, res) => {
  try {
    const user = await User.findById(req.auth.sub);
    const twitchBotConfig = await Config.findOne({ id: "twitch" });
    const botHasJoined = twitchBotConfig.config.channels.includes(
      user.twitchUserData.login
    );
    res.status(200).json({ botHasJoined });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @TODO DRY: Duplicating this functionality from /twitch for now until I can adapt the services to use a JWT as well
// POST /me/twitch/join -> adds logged-in user to join list for twitch bot
router.post("/twitch/join", async (req, res) => {
  res.status(410).json({ message: "This endpoint is no longer supported" });
  // try {
  //   const user = await User.findById(req.auth.sub);
  //   const twitchConfig = await Config.findOne({ id: "twitch" });
  //   if (twitchConfig.config.channels.includes(user.twitchUserData.login)) {
  //     return res.status(200).json({ noop: true });
  //   }

  //   twitchConfig.config.channels.push(user.twitchUserData.login);
  //   twitchConfig.markModified("config");
  //   await twitchConfig.save();

  //   req.app.wsRelay.emit("joinChannel", user.twitchUserData.login);

  //   res.status(200).json({ result: true });
  // } catch (err) {
  //   res.status(500).json({ message: err.message });
  // }
});

// POST /me/twitch/leave -> removes logged-in user from join list for twitch bot
router.post("/twitch/leave", async (req, res) => {
  res.status(410).json({ message: "This endpoint is no longer supported" });
  // try {
  //   const user = await User.findById(req.auth.sub);
  //   const twitchConfig = await Config.findOne({ id: "twitch" });
  //   if (!twitchConfig.config.channels.includes(user.twitchUserData.login)) {
  //     return res.status(200).json({ noop: true });
  //   }

  //   twitchConfig.config.channels = twitchConfig.config.channels.filter(
  //     (c) => c !== user.twitchUserData.login
  //   );
  //   twitchConfig.markModified("config");
  //   await twitchConfig.save();

  //   req.app.wsRelay.emit("leaveChannel", user.twitchUserData.login);

  //   res.status(200).json({ result: true });
  // } catch (err) {
  //   res.status(500).json({ message: err.message });
  // }
});

module.exports = router;
