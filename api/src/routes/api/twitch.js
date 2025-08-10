const express = require("express");
const router = express.Router();
const TwitchApi = require("../../lib/twitch-api");
const Config = require("../../models/config");
const User = require("../../models/user");
const { getRequestedChannel } = require("../../lib/utils");
const guard = require("express-jwt-permissions")();
const { ALLOWED_COMMAND_PREFIXES } = require("../../constants");

// GET /channels -> returns list of channels currently auto-joined by the bot (admin-only)
router.get("/channels", guard.check("admin"), async (req, res) => {
  try {
    const users = await User.find({ "twitchBotConfig.active": true });
    const channels = users.map((u) => u.twitchUserData.login).sort();
    res.status(200).json(channels);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /join -> adds requested or logged-in user to join list for twitch bot
router.post("/join", async (req, res) => {
  let user;
  // check for a logged-in user requesting the bot to join the channel
  if (
    !req.user.permissions.includes("service") &&
    (!req.user.permissions.includes("admin") || !req.body.channel)
  ) {
    user = await User.findById(req.user.sub);
    user.twitchBotConfig.active = true;
    user.markModified("twitchBotConfig");
    await user.save();
  } else {
    // otherwise, extract the requested channel from the service or admin request
    const requestedChannel = await getRequestedChannel(req);
    if (!requestedChannel) {
      return res
        .status(400)
        .json({ result: "error", message: "Invalid channel provided" });
    }

    try {
      user = await User.findOne({
        "twitchUserData.login": requestedChannel,
      });
      if (user) {
        if (user.twitchBotConfig?.active) {
          return res.status(200).json({
            result: "noop",
            message: `Already joined ${requestedChannel}!`,
          });
        }

        user.twitchBotConfig.active = true;
        user.markModified("twitchBotConfig");
        await user.save();
      } else {
        // Get user data from Twitch
        const { config: streamAlertsConfig } = await Config.findOne({
          id: "streamAlerts",
        });
        const twitchApiClient = new TwitchApi({
          client_id: streamAlertsConfig.clientId,
          client_secret: streamAlertsConfig.clientSecret,
        });

        let twitchUserData = null;
        try {
          const response = await twitchApiClient.getUsers(requestedChannel);
          if (!response || !response.data || !response.data[0]) {
            throw new Error(`Unable to get user data for channel ${channel}`);
          }
          twitchUserData = response.data[0];
        } catch (err) {
          console.error(
            `Error fetching user data for ${requestedChannel} from Twitch!`,
            err,
          );
          return res.status(500).json({
            result: "error",
            message: `Unable to fetch twitch user data for ${requestedChannel}!`,
          });
        }

        try {
          // Create new user and set the twitch bot to active
          user = await User.create({
            twitchUserData,
            twitchBotConfig: { active: true },
          });
        } catch (err) {
          console.error(
            `Error creating new user for ${requestedChannel}!`,
            err,
          );
          return res.status(500).json({
            result: "error",
            message: `Unable to create new user for ${requestedChannel}!`,
          });
        }
      }
    } catch (err) {
      return res.status(500).json({ result: "error", message: err.message });
    }
  }

  // tell the twitch bot to do the requested thing (unless this came from the twitch bot itself)
  if (!req.user.permissions.includes("service") || req.user.sub !== "twitch") {
    req.app.wsRelay.emit("joinChannel", {
      channel: user.twitchUserData.login,
    });
  }

  res.status(200).json({
    result: "success",
    twitchBotConfig: {
      roomId: user.twitchUserData.id,
      ...user.twitchBotConfig,
    },
  });
});

// POST /leave -> removes requested or logged-in user from join list for twitch bot
router.post("/leave", async (req, res) => {
  const requestedChannel = await getRequestedChannel(req);
  if (!requestedChannel) {
    return res
      .status(400)
      .json({ result: "error", message: "Invalid channel provided" });
  }

  try {
    const user = await User.findOne({
      "twitchUserData.login": requestedChannel,
    });
    if (!user) {
      return res
        .status(200)
        .json({ result: "noop", message: `Not in ${requestedChannel}!` });
    }

    user.twitchBotConfig.active = false;
    user.markModified("twitchBotConfig");
    await user.save();

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

// PATCH /config -> updates twitch bot configuration for a channel
router.patch("/config", async (req, res) => {
  const requestedChannel = await getRequestedChannel(req);
  if (!requestedChannel) {
    return res
      .status(400)
      .json({ result: "error", message: "Invalid channel provided" });
  }

  // Validate that only allowed config fields are being updated
  const allowedFields = [
    "commandsEnabled",
    "commandPrefix",
    "textCommandCooldown",
    "practiceListsEnabled",
    "allowModsToManagePracticeLists",
    "weeklyRaceAlertEnabled",
  ];

  const updates = {};
  for (const field of allowedFields) {
    if (req.body.hasOwnProperty(field)) {
      const value = req.body[field];

      // Validate commandPrefix if provided
      if (field === "commandPrefix") {
        if (typeof value !== "string" || value.length !== 1) {
          return res.status(400).json({
            result: "error",
            message: "Command prefix must be exactly one character",
          });
        }
        if (!ALLOWED_COMMAND_PREFIXES.includes(value)) {
          return res.status(400).json({
            result: "error",
            message: `Invalid command prefix. Allowed: ${ALLOWED_COMMAND_PREFIXES.join(", ")}`,
          });
        }
      }

      updates[`twitchBotConfig.${field}`] = value;
    }
  }

  if (Object.keys(updates).length === 0) {
    return res
      .status(400)
      .json({ result: "error", message: "No valid fields to update" });
  }

  try {
    const user = await User.findOne({
      "twitchUserData.login": requestedChannel,
    });

    if (!user) {
      return res.status(404).json({
        result: "error",
        message: `User ${requestedChannel} not found`,
      });
    }

    // Apply updates
    for (const [path, value] of Object.entries(updates)) {
      const keys = path.split(".");
      let current = user;
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
    }

    user.twitchBotConfig.lastUpdated = Date.now();
    user.markModified("twitchBotConfig");
    await user.save();

    // Emit configuration update event to the twitch bot
    if (
      !req.user.permissions.includes("service") ||
      req.user.sub !== "twitch"
    ) {
      req.app.wsRelay.emit("configUpdate", {
        roomId: user.twitchUserData.id,
        channelName: user.twitchUserData.login,
        displayName: user.twitchUserData.display_name,
        ...user.twitchBotConfig,
      });
    }

    res.status(200).json({
      result: "success",
      twitchBotConfig: {
        roomId: user.twitchUserData.id,
        ...user.twitchBotConfig,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
