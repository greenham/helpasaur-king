const express = require("express");
const cookieParser = require("cookie-parser");
const { requireAuthKey, requireJwtToken } = require("../../lib/utils");
const router = express.Router();
const User = require("../../models/user");
const Config = require("../../models/config");

router.use(express.json());

// Public Endpoints
router.use("/commands", require("./commands"));
router.use("/streams", require("./streams"));
router.use("/web", require("./web"));

// Service Endpoints
router.use("/twitch", requireAuthKey, require("./twitch"));
router.use("/configs", requireAuthKey, require("./configs"));
router.use("/streamAlerts", requireAuthKey, require("./stream-alerts"));

// User Endpoints
router.use(cookieParser());
router.get("/me", requireJwtToken, async (req, res) => {
  try {
    const user = await User.findById(req.auth.sub);
    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/me/twitch", requireJwtToken, async (req, res) => {
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
// POST /join -> adds requested user to join list for twitch bot
router.post("/me/twitch/join", requireJwtToken, async (req, res) => {
  try {
    const user = await User.findById(req.auth.sub);
    const twitchConfig = await Config.findOne({ id: "twitch" });
    if (twitchConfig.config.channels.includes(user.twitchUserData.login)) {
      return res.status(200).json({ noop: true });
    }

    twitchConfig.config.channels.push(user.twitchUserData.login);
    twitchConfig.markModified("config");
    await twitchConfig.save();

    req.app.wsRelay.emit("joinChannel", user.twitchUserData.login);

    res.status(200).json({ result: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /leave -> removes requested user from join list for twitch bot
router.post("/me/twitch/leave", requireJwtToken, async (req, res) => {
  try {
    const user = await User.findById(req.auth.sub);
    const twitchConfig = await Config.findOne({ id: "twitch" });
    if (!twitchConfig.config.channels.includes(user.twitchUserData.login)) {
      return res.status(200).json({ noop: true });
    }

    twitchConfig.config.channels = twitchConfig.config.channels.filter(
      (c) => c !== user.twitchUserData.login
    );
    twitchConfig.markModified("config");
    await twitchConfig.save();

    req.app.wsRelay.emit("leaveChannel", user.twitchUserData.login);

    res.status(200).json({ result: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
