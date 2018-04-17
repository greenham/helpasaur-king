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

let raceDefaults = {
	"category": "253d897e-3fc2-4cb1-945c-a24e6c423663",	// ALttP Any% NMG No S+Q
	"startupMode": "READY_UP",
	"ranked": false,
	"unlisted": true,
	"streamed": false
};

let raceNamePrefix = "NMG Tourney";

router.get('/', (req, res) => {
	res.render('tourney/index');
});

router.get('/schedule', (req, res) => {
	// Get the current time in UTC
  let now = moment().tz("UTC");
  let start = now.format();
  let end = now.add({days: 3}).format();

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
						decorateRacers: decorateRacers,
						parseCommentary: parseCommentary
					}
				});
			}
		});
});

// Manage Race
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
						decorateRacers: decorateRacers,
						parseCommentary: parseCommentary,
						restreamStatus: (channel) => {
							if (channel) {
					    	if (channel.slug.match(/^speedgaming/)) {
					    		return `On <a href="https://twitch.tv/${channel.slug}" class="card-link" target="_blank">${channel.name}</a>`;
					    	} else {
				    			return channel.name;
				    		}
				    	} else {
				    		return "<em>Restream Undecided</em>";
				    	}
						}
					}
				})
			}
		});
});

// Create Race
router.post('/races', (req, res) => {
	var raceId = req.body.id;
	db.get().collection("tourney-events")
		.findOne({"_id": db.oid(raceId)}, (err, race) => {
			if (err) {
				res.send('Error!');
				console.error(err);
			} else {
				// create race via SRTV
				let racers = getRacersPlain(race);
				let raceName = `${raceNamePrefix} | ${racers}`;
				let newRace = Object.assign(raceDefaults, {"name": raceName});

				console.log("Starting race creation...");

				SRTV.createRace(newRace)
					.then(raceGuid => {
						console.log(`Race '${newRace.name}' created successfully: ${raceGuid}`);

						// store guid of race in DB
						db.get().collection("tourney-events")
							.update({"_id": db.oid(raceId)}, {$set: {"srtvRace": {"guid": raceGuid}}}, (err, result) => {
								if (err) {
									res.status(500).send({"error": err});
								} else {
									res.send({"raceLink": SRTV.raceUrl(raceGuid)})
								}
							});
					})
					.catch(console.error);
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

// @TODO: Find a better spot/method for doing this
let parseRacers = (players) => {
	if (!players) { return null; }
	let player1 = (typeof players[0] !== 'undefined') ? players[0] : null;
	let player2 = (typeof players[1] !== 'undefined') ? players[1] : null;

	if (player1 === null && player2 === null) {
		return null;
	}

	return {
		player1: player1,
		player2: player2
	};
};

let decorateRacers = (players) => {

	let parsed = parseRacers(players);
	if (!parsed) {
		return '';
	}


	let ret = '<span class="racers">';

	if (parsed.player1 !== null) {
		ret += `<span class="racer">${parsed.player1.displayName}</span> v `;
	}

	if (parsed.player2 !== null) {
		ret += `<span class="racer">${parsed.player2.displayName}</span>`;
	}

	ret += '</span>';

	return ret;
};

let getRacersPlain = (race) => {
	return decorateRacers(race.match1.players).replace(/<(?:.|\n)*?>/gm, '') + ((race.match2) ? `. ${decorateRacers(race.match2.players).replace(/<(?:.|\n)*?>/gm, '')}` : '')
};

let parseCommentary = (commentators) => {
	if (commentators === null || commentators.length === 0) { return '<span class="text-danger"><em>None</em></span>'; }
	let ret = '<span>';
	ret += commentators.map(e => e.displayName).join(', ');
	ret += '</span>';
	return ret;
};

module.exports = router;