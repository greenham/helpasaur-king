const express = require("express");
const router = express.Router();
const axios = require("axios");
const linkifyStr = require("linkify-string");
const { API_URL } = process.env;

// Homepage
router.get("/", (req, res) => {
  res.redirect("/commands");
});

// Command List
router.get("/commands", async (req, res) => {
  // @TODO: Better error handling
  const response = await axios.get(`${API_URL}/commands`);

  // Put the commands in alphabetical order
  let commands = response.data.sort((a, b) =>
    a.command > b.command ? 1 : b.command > a.command ? -1 : 0
  );

  commands = commands.map((c) => {
    c.response = linkifyStr(c.response);
    return c;
  });

  res.render("commands", { commands });
});

// Livestreams
router.get("/livestreams", async (req, res) => {
  // @TODO: Better error handling
  const response = await axios.get(`${API_URL}/streams/live`);

  let livestreams = response.data || [];

  const streamAlertsConfig = req.app.locals.configs.get("streamAlerts");
  const { blacklistedUsers, channels, statusFilters } = streamAlertsConfig;
  const speedrunTester = new RegExp(statusFilters, "i");

  console.log(`${livestreams.length} streams returned from API`);

  if (livestreams.length > 0) {
    // Do some additional ordering/filtering:

    // 1. remove streams from users on the blacklist
    livestreams = livestreams.filter(
      (stream) => !blacklistedUsers.includes(stream.user_name.toLowerCase())
    );
    console.log(`- ${livestreams.length} after applying blacklist`);

    // 2. attempt to filter out most non-speedrun streams
    livestreams = livestreams.filter(
      (stream) => !speedrunTester.test(stream.title)
    );
    console.log(`- ${livestreams.length} after applying speedrun filter`);

    // 3. prioritize streams that are in the alert list
    let topStreams = livestreams.filter((stream) =>
      channels.includes(stream.user_name.toLowerCase())
    );
    console.log(`- ${topStreams.length} on the alert list`);
    topStreams = topStreams.map((s) => {
      s.isOnAlertsList = true;
      return s;
    });

    // 4. now create a merged list, with topStreams first, then anything in livestreams that isn't in topStreams
    let otherStreams = livestreams.filter((stream) => {
      let matchIndex = topStreams.findIndex((s) => {
        return s.id === stream.id;
      });
      return matchIndex === -1;
    });
    console.log(`- ${otherStreams.length} not on the alert list`);

    livestreams = topStreams.concat(otherStreams);
    console.log(`- ${livestreams.length} after all processing`);
  }

  res.render("twitch/livestreams", { livestreams });
});
router.get("/streams", (req, res) => {
  res.redirect("/livestreams");
});
router.get("/live", (req, res) => {
  res.redirect("/livestreams");
});

module.exports = router;
