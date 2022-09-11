const express = require("express");
const router = express.Router();
const axios = require("axios");
const { API_URL } = process.env;

// Homepage
router.get("/", (req, res) => {
  if (!req.user) {
    res.redirect("/login");
  } else {
    res.render("index");
  }
});

// Login page
router.get("/login", (req, res) => {
  if (req.user) {
    res.redirect("/");
  }

  res.render("login");
});

// Login POST
// router.post("/login", passport.authenticate("local"), (req, res) => {
//   res.send({ result: true });
// });

// Logout
router.get("/logout", (req, res) => {
  req.logout();
  res.redirect("/");
});

/******************/
/** Public Routes */
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
  const response = await axios.get(`${API_URL}/streams/live`);
  const livestreams = response.data || [];
  res.render("twitch/new-livestreams", { livestreams });
});

// router.get("/livestreams", (req, res) => {
//   let config = req.app.locals.config.streamAlerts;
//   let alertChannels = config.channels;
//   config.channels = [];

//   let streamWatcher = new streamAlerts(config);
//   streamWatcher
//     .findStreams()
//     .then((livestreams) => {
//       // do some additional ordering/filtering
//       // 1. remove streams from users on the blacklist
//       livestreams = livestreams.filter((stream) => {
//         return !config.blacklistedUsers.includes(
//           stream.user_name.toLowerCase()
//         );
//       });

//       // 2. prioritize streams that are in the alert list
//       let topStreams = livestreams.filter((stream) => {
//         return alertChannels.includes(stream.user_name.toLowerCase());
//       });

//       // 3. now create a merged list, with topStreams first, then anything in livestreams that isn't in topStreams
//       let otherStreams = livestreams.filter((stream) => {
//         let matchIndex = topStreams.findIndex((s) => {
//           return s.id === stream.id;
//         });
//         return matchIndex === -1;
//       });

//       livestreams = topStreams.concat(otherStreams);

//       res.render("twitch/new-livestreams", {
//         livestreams: livestreams,
//       });
//     })
//     .catch((err) => {
//       console.log(err);
//       res.render("error", { error: err });
//     });
// });
/******************/

// Admin Routes
// router.use(
//   "/tourney",
//   isLoggedIn,
//   permit("tourney-admin"),
//   require("./tourney.js")
// );
// router.use("/discord", isLoggedIn, permit("admin"), require("./discord.js"));
// router.use("/srtv", isLoggedIn, permit("admin"), require("./srtv.js"));
// router.use("/twitch", isLoggedIn, permit("admin"), require("./twitch.js"));
// router.use("/settings", isLoggedIn, require("./settings.js"));

module.exports = router;
