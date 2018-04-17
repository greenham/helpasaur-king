const express = require('express'),
  router = express.Router(),
  SG = require('../lib/speedgaming.js'),
  SRTV = require('../lib/srtv.js'),
  DISCORD = require('discord.js'),
  moment = require('moment-timezone'),
  db = require('../db');

const raceAnnouncements = [
	"Welcome, Racers!",
	"Reminder: Disable all alerts/overlays covering your game feed or timer and please use game audio only!",
	"Please choose a single character for your opponent to use for their filename ASAP."
];

router.get('/', (req, res) => {
	res.render('tourney/index');
});

router.get('/schedule', (req, res) => {
	// Get the current time in UTC
  let now = moment().tz("UTC");
  let start = now.format();
  let end = now.add({days: 2}).format();

	db.get().collection("tourney-events")
		.find({when: {$gte: start, $lte: end}})
		.sort({when: 1})
		.toArray((err, events) => {
			if (err) {
				res.send('Error!');
				console.log(err);
			} else {
				res.render('tourney/schedule', {
					events: events,
					helpers: {
						parseRacers: parseRacers,
						parseCommentary: parseCommentary
					}
				});
			}
		});
});

router.get('/races/:id', (req, res) => {
	db.get().collection("tourney-events")
		.findOne({"_id": db.oid(req.params.id)}, (err, result) => {
			if (err) {
				res.send('Error!');
				console.error(err);
			} else {
				res.render('tourney/race', {
					race: result,
					helpers: {
						parseRacers: parseRacers,
						parseCommentary: parseCommentary
					}
				})
			}
		});
});

router.post('/races', (req, res) => {
	var raceId = req.body.id;
	db.get().collection("tourney-events")
		.findOne({"_id": db.oid(raceId)}, (err, result) => {
			if (err) {
				res.send('Error!');
				console.error(err);
			} else {
				// @TODO: create race via SRTV
				// @TODO: store guid of race in DB
				// @TODO: return json
			}
		});
});

router.get('/races/:guid/announce', (req, res) => {
	SRTV.getRace(req.params.guid)
		.then(race => {
			console.log(`Sending announcements for race ${req.params.guid}...`);
			SRTV.say(race.announcements, raceAnnouncements)
				.then(sent => {
					res.send(`Sent race announcements for race ${req.params.guid}`);
					console.log("Sent.");
				})
				.catch(err => {
					res.send("An error has occurred. Check the logs for more info.");
					console.error(err);
				});
		})
		.catch(err => {
			res.send("An error has occurred. Check the logs for more info.");
			console.error(err);
		})
});

let parseRacers = (players) => {
	if (!players) { return ''; }
	let player1 = (typeof players[0] !== 'undefined') ? players[0] : null;
	let player2 = (typeof players[1] !== 'undefined') ? players[1] : null;

	if (player1 === null && player2 === null) {
		return '';
	}

	let ret = '<p>';

	if (player1 !== null) {
		ret += `<span class="racer">${player1.displayName}</span> v `;
	}

	if (player2 !== null) {
		ret += `<span class="racer">${player2.displayName}</span>`;
	}

	ret += '</p>';

	return ret;
};

let parseCommentary = (commentators) => {
	if (commentators === null || commentators.length === 0) { return '<p class="text-danger"><em>None</em></p>'; }
	let ret = '<p>';
	ret += commentators.map(e => e.displayName).join(', ');
	ret += '</p>';
	return ret;
};

module.exports = router;