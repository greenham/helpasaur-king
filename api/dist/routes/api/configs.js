"use strict";
const express = require("express");
const router = express.Router();
const Config = require("../../models/config");
const User = require("../../models/user");
// Endpoint: /config
// GET / -> returns all configs
router.get("/", async (req, res) => {
    try {
        const configs = await Config.find();
        res.status(200).json(configs);
    }
    catch (err) {
        res.status(500).json({ message: err.message });
    }
});
// GET /:id -> returns config for id
router.get("/:id", async (req, res) => {
    try {
        const result = await Config.findOne({ id: req.params.id });
        res.status(200).json(result);
    }
    catch (err) {
        res.status(500).json({ message: err.message });
    }
});
// GET /twitch/activeChannels -> returns active channels to be joined by the Twitch bot
router.get("/twitch/activeChannels", async (req, res) => {
    if (req.user.sub !== "twitch") {
        return res.status(401).json({ message: "Unauthorized" });
    }
    try {
        const users = await User.find({ "twitchBotConfig.active": true });
        const channels = users.map((u) => Object.assign({
            roomId: u.twitchUserData.id,
            channelName: u.twitchUserData.login,
            displayName: u.twitchUserData.display_name,
        }, u.twitchBotConfig));
        res.status(200).json(channels);
    }
    catch (err) {
        res.status(500).json({ message: err.message });
    }
});
module.exports = router;
//# sourceMappingURL=configs.js.map