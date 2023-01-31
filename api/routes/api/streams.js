const express = require("express");
const router = express.Router();
const TwitchApi = require("node-twitch").default;
const Config = require("../../models/config");

const getStreamAlertsConfig = async () => {
  return await Config.findOne({ id: "streamAlerts" });
};

// Endpoint: /streams

// GET /live -> returns all live alttp streams
router.get("/live", async (req, res) => {
  const { config: streamAlertsConfig } = await getStreamAlertsConfig();
  const twitchApiClient = new TwitchApi({
    client_id: streamAlertsConfig.clientId,
    client_secret: streamAlertsConfig.clientSecret,
  });

  let filter = {
    game_id: streamAlertsConfig.gameId,
    type: "live",
    first: 100,
  };

  if (req.query.cursor) {
    filter.cursor = req.query.cursor;
  }

  console.log(filter);

  try {
    const streams = await twitchApiClient.getStreams(filter);
    res.status(200).json(streams.data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/games", async (req, res) => {
  const { config: streamAlertsConfig } = await getStreamAlertsConfig();
  const twitchApiClient = new TwitchApi({
    client_id: streamAlertsConfig.clientId,
    client_secret: streamAlertsConfig.clientSecret,
  });

  try {
    const games = await twitchApiClient.getGames(streamAlertsConfig.gameName);
    res.status(200).json(games.data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;