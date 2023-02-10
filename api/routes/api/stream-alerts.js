const express = require("express");
const router = express.Router();
const TwitchApi = require("../../lib/twitch-api");
const Config = require("../../models/config");
const getTwitchApiClient = (config) => {
  return new TwitchApi({
    clientId: config.clientId,
    clientSecret: config.clientSecret,
  });
};
const STREAM_ONLINE_EVENT = "stream.online";

// Endpoint: /streamAlerts

// POST /channels -> add new channel to list, subscribe to webhook event
router.post("/channels", async (req, res) => {
  const streamAlertsConfig = await Config.findOne({ id: "streamAlerts" });
  console.log(`Received request to add ${req.body.channel} to stream alerts`);

  try {
    // Ensure this isn't in the channel list already
    if (
      streamAlertsConfig.config.channels.find(
        (c) => c.login == req.body.channel.toLowerCase()
      ) !== undefined
    ) {
      console.log(`${req.body.channel} is already in the list!`);
      return res.status(200).json({ noop: true });
    }

    // If not, query Twitch API for the user info by their login name
    const twitchApiClient = getTwitchApiClient(streamAlertsConfig.config);
    twitchApiClient.on("ready", async () => {
      const userResult = await twitchApiClient.getUsers(req.body.channel);
      if (!userResult || !userResult.data || !userResult.data[0]) {
        throw new Error(
          `Unable to get user data for channel ${req.body.channel}`
        );
      }

      const userData = userResult.data[0];
      console.log(`Got user data from Twitch:`);
      console.log(userData);

      // Add to list of channels in config
      console.log(`Adding to list...`);
      streamAlertsConfig.config.channels.push(userData);
      streamAlertsConfig.markModified("config");
      await streamAlertsConfig.save();

      // Subscribe to event when stream goes live
      console.log(
        `Creating webhook subscription for ${STREAM_ONLINE_EVENT} event`
      );
      const newSub = twitchApiClient.createSubscription(
        userData.id,
        STREAM_ONLINE_EVENT
      );
      console.log(
        `Subscription ${newSub.id} ${newSub.status} at ${newSub.created_at} (${user.login})`
      );

      res.status(200).json({ success: true });
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /channels/:id -> remove channel by user ID, delete webhook subscription for that user ID
router.delete("/channels/:id", async (req, res) => {
  try {
    const streamAlertsConfig = await Config.findOne({ id: "streamAlerts" });
    console.log(
      `Received request to remove ${req.params.id} from stream alerts`
    );

    // Ensure this in the channel list already
    if (
      streamAlertsConfig.config.channels.find((c) => c.id == req.params.id) ===
      undefined
    ) {
      console.log(`${req.params.id} is not in the stream alerts list!`);
      return res.status(200).json({ noop: true });
    }

    // Remove from list of channels in config
    console.log(`Removing from list...`);
    // streamAlertsConfig.config.channels.push(userData);
    // streamAlertsConfig.markModified("config");
    // await streamAlertsConfig.save();

    // Delete webhook subscription
    const twitchApiClient = getTwitchApiClient(streamAlertsConfig.config);
    twitchApiClient.on("ready", async () => {
      console.log(
        `Removing webhook subscription for ${STREAM_ONLINE_EVENT} event`
      );
      twitchApiClient.deleteSubscription({ user_id: req.params.id });
    });

    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /subscriptions -> get list of webhook subscriptions (supports 'after' param)
router.get("/subscriptions", async (req, res) => {
  try {
    const streamAlertsConfig = await Config.findOne({ id: "streamAlerts" });
    const twitchApiClient = getTwitchApiClient(streamAlertsConfig.config);
    twitchApiClient.on("ready", async () => {
      const results = await twitchApiClient.getSubscriptions(
        req.params.after || ""
      );
      res.status(200).json(results.data);
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /subscriptions -> delete subscription by ID (id or user_id)
// POST /subscriptions -> create new webhook subscription for specified channel ID (ensure it exists in channel list?)

module.exports = router;
