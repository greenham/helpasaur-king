const express = require("express");
const router = express.Router();
const axios = require("axios");
const linkifyStr = require("linkify-string");
const { API_URL, API_KEY } = process.env;
axios.defaults.headers.common["Authorization"] = API_KEY;

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

  res.render("commands", { commands, title: "Commands | Helpasaur King" });
});

// Livestreams
router.get("/streams", async (req, res) => {
  // @TODO: Better error handling
  const response = await axios.get(`${API_URL}/streams/live`);

  let livestreams = response.data || [];

  const streamAlertsConfig = req.app.locals.configs.get("streamAlerts");
  const { blacklistedUsers, channels, statusFilters } = streamAlertsConfig;
  const speedrunTester = new RegExp(statusFilters, "i");

  if (livestreams.length > 0) {
    // Do some additional ordering/filtering:

    // 1. remove streams from users on the blacklist
    livestreams = livestreams.filter(
      (stream) => !blacklistedUsers.includes(stream.user_name.toLowerCase())
    );

    // 2. attempt to filter out most non-speedrun streams
    livestreams = livestreams.filter(
      (stream) => !speedrunTester.test(stream.title)
    );

    // 3. prioritize streams that are in the alert list
    let topStreams = livestreams.filter((stream) =>
      channels.includes(stream.user_name.toLowerCase())
    );
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

    livestreams = topStreams.concat(otherStreams);
  }

  res.render("twitch/livestreams", {
    livestreams,
    title: "ALttP Streams | Helpasaur King",
  });
});
router.get("/live", (req, res) => {
  res.redirect("/streams");
});
router.get("/livestreams", (req, res) => {
  res.redirect("/streams");
});

module.exports = router;
