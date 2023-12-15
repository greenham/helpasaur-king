const express = require("express");
const router = express.Router();
const TwitchApi = require("../../lib/twitch-api");
const Config = require("../../models/config");
const guard = require("express-jwt-permissions")();
const getTwitchApiClient = (config) => {
  return new TwitchApi({
    client_id: config.clientId,
    client_secret: config.clientSecret,
  });
};

// Endpoint: /streamAlerts

// POST /channels
//
//  Request Body:
//    { channels: Array<String> }
//
//  Adds new channels to stream alerts list and subscribes to necessary Twitch events
router.post("/channels", guard.check("admin"), async (req, res) => {
  if (!req.body.hasOwnProperty("channels")) {
    return res
      .status(400)
      .json({ message: "Missing payload property 'channels' (Array<String>)" });
  }

  if (!Array.isArray(req.body.channels)) {
    return res
      .status(400)
      .json({ message: "'channels' must be an Array of usernames" });
  }

  if (req.body.channels.length === 0) {
    return res.status(400).json({ message: "No channels provided in Array" });
  }

  const streamAlertsConfig = await Config.findOne({ id: "streamAlerts" });
  const twitchApiClient = getTwitchApiClient(streamAlertsConfig.config);
  console.log(
    `Adding ${req.body.channels.length} channels to stream alerts...`
  );

  const results = req.body.channels.map(async (channel) => {
    // Ensure this isn't in the channel list already
    if (
      streamAlertsConfig.config.channels.find(
        (c) => c.login == channel.toLowerCase()
      ) !== undefined
    ) {
      return {
        status: "error",
        channel,
        message: `${channel} is already in the list!`,
      };
    }

    // Query Twitch API for the user info by their login name
    const userResult = await twitchApiClient.getUsers(channel);
    if (!userResult || !userResult.data || !userResult.data[0]) {
      return {
        status: "error",
        channel,
        message: `Unable to get user data for channel ${channel}`,
      };
    }
    const userData = userResult.data[0];

    const subscriptionResults = await twitchApiClient.subscribeToStreamEvents({
      channel,
      userId: userData.id,
    });

    streamAlertsConfig.config.channels.push(userData);
    streamAlertsConfig.markModified("config");
    await streamAlertsConfig.save();
    console.log(`Added ${channel} to stream alerts list`);

    return { success: true, channel, subscriptionResults };
  });

  Promise.allSettled(results).then(async (channelResults) => {
    res.status(200).json({ success: true, data: channelResults });
  });
});

// DELETE /channels/:id -> remove channel by user ID, delete event subscriptions for that user ID
router.delete("/channels/:id", guard.check("admin"), async (req, res) => {
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

    // Delete event subscriptions
    const twitchApiClient = getTwitchApiClient(streamAlertsConfig.config);
    console.log(
      `Removing event subscriptions for ${streamAlertsConfig.config.channels[channelIndex].login}`
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

    // Remove from list of channels in config
    console.log(`Removing from list...`);
    streamAlertsConfig.config.channels.splice(channelIndex, 1);
    streamAlertsConfig.markModified("config");
    await streamAlertsConfig.save();

    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /subscriptions -> get list of webhook subscriptions
router.get("/subscriptions", guard.check("admin"), async (req, res) => {
  try {
    const streamAlertsConfig = await Config.findOne({ id: "streamAlerts" });
    const twitchApiClient = getTwitchApiClient(streamAlertsConfig.config);
    const results = await twitchApiClient.getSubscriptions(req.query);
    res.status(200).json(results);
  } catch (err) {
    res.status(500).json({ success: false, error: err });
  }
});

router.delete("/subscriptions/all", guard.check("admin"), async (req, res) => {
  const streamAlertsConfig = await Config.findOne({ id: "streamAlerts" });
  const twitchApiClient = getTwitchApiClient(streamAlertsConfig.config);
  twitchApiClient
    .clearSubscriptions()
    .then((results) => {
      res.status(200).json(results);
    })
    .catch((err) => {
      console.error("error from clearSubscriptions");
      res.status(500).json({ success: false, error: err });
    });
});

// @TODO DRY this out into something that can do basic list management / user querying
router.post("/channels/blacklist", guard.check("admin"), async (req, res) => {
  if (!req.body.hasOwnProperty("channels")) {
    return res
      .status(400)
      .json({ message: "Missing payload property 'channels' (Array<String>)" });
  }

  if (!Array.isArray(req.body.channels)) {
    return res
      .status(400)
      .json({ message: "'channels' must be an Array of usernames" });
  }

  if (req.body.channels.length === 0) {
    return res.status(400).json({ message: "No channels provided in Array" });
  }

  const streamAlertsConfig = await Config.findOne({ id: "streamAlerts" });
  const twitchApiClient = getTwitchApiClient(streamAlertsConfig.config);
  console.log(
    `Blacklisting ${req.body.channels.length} channels from stream directory...`
  );

  const results = req.body.channels.map(async (channel) => {
    // Query Twitch API for the user info by their login name
    const userResult = await twitchApiClient.getUsers(channel);
    if (!userResult || !userResult.data || !userResult.data[0]) {
      return {
        status: "error",
        channel,
        message: `Unable to get user data for channel ${channel}`,
      };
    }
    const userData = userResult.data[0];

    // Ensure this user isn't in the blacklist already
    if (streamAlertsConfig.config.blacklistedUsers.includes(userData.id)) {
      return {
        status: "error",
        channel,
        message: `${channel} is already in the blacklist!`,
      };
    }

    streamAlertsConfig.config.blacklistedUsers.push(userData.id);
    streamAlertsConfig.markModified("config");
    await streamAlertsConfig.save();
    console.log(`Added ${channel} to blacklisted users`);

    return { success: true, channel };
  });

  Promise.allSettled(results).then(async (channelResults) => {
    res.status(200).json({ success: true, data: channelResults });
  });
});

module.exports = router;
