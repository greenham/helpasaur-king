const express = require("express"),
  router = express.Router(),
  moment = require("moment-timezone"),
  tasks = require("../../lib/tasks.js");

// Tourney Races
router.use("/races", require("./tourney/races.js"));

// Tourney People
router.use("/people", require("./tourney/people.js"));

// Tourney Schedule
router.get(["/", "/upcoming", "/recent", "/today", "/all"], (req, res) => {
  // Determine start/end/sort based on URL
  let start, end, sort, headerText;
  switch (req.path.slice(1, req.path.length)) {
    case "upcoming":
      start = moment().tz("UTC").subtract({ hours: 2 }).format();
      end = moment().tz("UTC").add({ days: 7 }).format();
      headerText = "Upcoming";
      break;
    case "recent":
      start = moment().tz("UTC").subtract({ days: 7 }).format();
      end = moment().tz("UTC").format();
      sort = { when: -1 };
      headerText = "Recent";
      break;
    case "all":
      start = moment("2018-03-25T00:00:00").tz("UTC").format();
      end = moment("2019-03-25T00:00:00").tz("UTC").format();
      sort = { when: -1 };
      headerText = "All";
      break;
    case "":
    case "today":
    default:
      start = moment().startOf("day").tz("UTC").format();
      end = moment().endOf("day").tz("UTC").format();
      headerText = "Today's";
      break;
  }

  getRaces(start, end, sort)
    .then((events) => {
      res.render("tourney/schedule", {
        pageHeader: `${headerText} Races`,
        events: events,
      });
    })
    .catch((err) => {
      console.error(err);
      res.render("error", { error: err });
    });
});

// Challonge Brackets
router.get("/brackets", (req, res) => {
  res.render("tourney/challonge");
});

// Manual SG schedule refresh
router.get("/refresh", (req, res) => {
  tasks
    .refreshSpeedgamingEvents("alttp")
    .then((result) => {
      res.send({ result: result });
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send(err);
    });
});

// Tourney Settings Control
router.get("/settings", (req, res) => {
  res.render("tourney/settings", req.app.locals.config.tourney);
});

router.post("/settings", (req, res) => {
  // @TODO: validation
  let update = {
    "tourney.racePings.guildId": req.body["racePings.guildId"],
    "tourney.racePings.textChannelName": req.body["racePings.textChannelName"],
    "tourney.raceNamePrefix": req.body.raceNamePrefix,
    "tourney.srtvRaceDefaults.unlisted":
      req.body["srtvRaceDefaults.unlisted"] == "true" ? true : false,
    "tourney.raceAnnouncements": req.body.raceAnnouncements
      .trim()
      .split("\r\n")
      .filter((e) => e.length > 0),
  };

  db.get()
    .collection("config")
    .update({ default: true }, { $set: update }, (err) => {
      if (err) {
        console.log(err);
        return res.status(500).send(err);
      }

      res.send({ updated: true });
    });
});

// @TODO: Find a better spot/method for these helper functions
let getRaces = (start, end, sort) => {
  sort = sort || { when: 1 };
  return new Promise((resolve, reject) => {
    db.get()
      .collection("tourney-events")
      .find({
        when: { $gte: start, $lte: end },
        approved: true,
        deleted: { $ne: true },
      })
      .sort(sort)
      .toArray((err, events) => {
        if (err) {
          reject(err);
        } else {
          resolve(events);
        }
      });
  });
};

module.exports = router;
