const express = require("express");
const router = express.Router();
const TwitchApi = require("../../lib/twitch-api");
const Config = require("../../models/config");
const getTwitchApiClient = (config) => {
  return new TwitchApi({
    client_id: config.clientId,
    client_secret: config.clientSecret,
  });
};
const STREAM_ONLINE_EVENT = "stream.online";
const CHANNEL_UPDATE_EVENT = "channel.update";

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
    const userResult = await twitchApiClient.getUsers(req.body.channel);
    if (!userResult || !userResult.data || !userResult.data[0]) {
      throw new Error(
        `Unable to get user data for channel ${req.body.channel}`
      );
    }

    const userData = userResult.data[0];

    // Subscribe to event when stream goes live
    console.log(`Creating event subscription for ${STREAM_ONLINE_EVENT} event`);
    let newSubResult = await twitchApiClient.createSubscription(
      userData.id,
      STREAM_ONLINE_EVENT
    );
    let newSub = newSubResult.data[0];
    console.log(
      `Subscription ${newSub.id} ${newSub.status} at ${newSub.created_at} (${req.body.channel})`
    );

    // Subscribe to event for channel updates (game, title, etc.)
    console.log(
      `Creating event subscription for ${CHANNEL_UPDATE_EVENT} event`
    );
    newSubResult = await twitchApiClient.createSubscription(
      userData.id,
      CHANNEL_UPDATE_EVENT
    );
    newSub = newSubResult.data[0];
    console.log(
      `Subscription ${newSub.id} ${newSub.status} at ${newSub.created_at} (${req.body.channel})`
    );

    // Add to list of channels in config
    console.log(`Adding to list...`);
    streamAlertsConfig.config.channels.push(userData);
    streamAlertsConfig.markModified("config");
    await streamAlertsConfig.save();

    res.status(200).json({ success: true });
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

    // Ensure this channel is in the list already
    const channelIndex = streamAlertsConfig.config.channels.findIndex(
      (c) => c.id == req.params.id
    );
    if (channelIndex === undefined) {
      console.log(`${req.params.id} is not in the stream alerts list!`);
      return res.status(200).json({ noop: true });
    }

    // Remove from list of channels in config
    console.log(`Removing from list...`);
    streamAlertsConfig.config.channels.splice(channelIndex, 1);
    streamAlertsConfig.markModified("config");
    await streamAlertsConfig.save();

    // Delete webhook subscription
    const twitchApiClient = getTwitchApiClient(streamAlertsConfig.config);
    console.log(
      `Removing event subscriptions for ${STREAM_ONLINE_EVENT} event`
    );

    // Do a lookup to get event subscriptions for this user, then delete them one-by-one
    const subscriptions = await twitchApiClient.getSubscriptions({
      user_id: req.params.id,
    });
    if (subscriptions && subscriptions.data && subscriptions.data.length > 0) {
      subscriptions.data.forEach(async (subscription) => {
        await twitchApiClient.deleteSubscription(subscription.id);
        console.log(`Deleted subscription ${subscription.id}`);
      });
    }

    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /subscriptions -> get list of webhook subscriptions
router.get("/subscriptions", async (req, res) => {
  try {
    const streamAlertsConfig = await Config.findOne({ id: "streamAlerts" });
    const twitchApiClient = getTwitchApiClient(streamAlertsConfig.config);
    const results = await twitchApiClient.getSubscriptions(req.query);
    res.status(200).json(results);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
