const express = require("express");
const router = express.Router();
const axios = require("axios");
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
  const commands = response.data.sort((a, b) =>
    a.command > b.command ? 1 : b.command > a.command ? -1 : 0
  );
  res.render("commands", { commands });
});

// Livestreams
router.get("/livestreams", async (req, res) => {
  // @TODO: Better error handling
  const response = await axios.get(`${API_URL}/streams/live`);
  const livestreams = response.data || [];
  // @TODO: Filter and order
  // if (livestreams.length > 0) {
  //   // do some additional ordering/filtering
  //   // 1. remove streams from users on the blacklist
  //   livestreams = livestreams.filter((stream) => {
  //     return !config.blacklistedUsers.includes(
  //       stream.user_name.toLowerCase()
  //     );
  //   });

  //   // 2. prioritize streams that are in the alert list
  //   let topStreams = livestreams.filter((stream) => {
  //     return alertChannels.includes(stream.user_name.toLowerCase());
  //   });

  //   // 3. now create a merged list, with topStreams first, then anything in livestreams that isn't in topStreams
  //   let otherStreams = livestreams.filter((stream) => {
  //     let matchIndex = topStreams.findIndex((s) => {
  //       return s.id === stream.id;
  //     });
  //     return matchIndex === -1;
  //   });

  //   livestreams = topStreams.concat(otherStreams);
  // }

  res.render("twitch/livestreams", { livestreams });
});

module.exports = router;
