const express = require("express");
const router = express.Router();
const TwitchApi = require("node-twitch").default;

// @TODO: Get these from config table
const twitchApiClient = new TwitchApi({
  client_id: "p000sp5q14fg2web0dx71p9fbmx5m9",
  client_secret: "wbnj484yj2c5gfyrxavjpimuqu0xzk",
});

// Endpoint: /streams

// GET / -> returns all live alttp streams
router.get("/live", async (req, res) => {
  // @TODO: Get game ID from config table
  let filter = {
    game_id: "9435",
    type: "live",
    first: 100,
  };

  if (req.query.cursor) {
    filter.cursor = req.query.cursor;
  }

  try {
    const streams = await twitchApiClient.getStreams(filter);
    res.status(200).json(streams.data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
