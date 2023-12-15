const express = require("express");
const router = express.Router();
const User = require("../../models/user");
const Config = require("../../models/config");

// User Endpoints (/api/me)

// GET /me
router.get("/", async (req, res) => {
  try {
    const user = await User.findById(req.user.sub);
    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /me/twitch
router.get("/twitch", async (req, res) => {
  try {
    const user = await User.findById(req.user.sub);
    const twitchBotConfig = await Config.findOne({ id: "twitch" });
    const botHasJoined = twitchBotConfig.config.channels.includes(
      user.twitchUserData.login
    );
    res.status(200).json({ botHasJoined });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
