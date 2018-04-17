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
	"unlisted": false,
	"streamed": false
};

let raceNamePrefix = "NMG Tourney";

router.get('/', (req, res) => {
	res.render('tourney/index');
});

router.get('/schedule', (req, res) => {
	// Get the current time in UTC
  let now = moment().tz("UTC");
  let start = now.subtract({hours: 2}).format();
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
						parseCommentary: parseCommentary,
						restreamStatus: restreamStatus
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
						restreamStatus: restreamStatus
					}
				});
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

									// fetch new race info and store as well
									updateSRTVRace(raceId, raceGuid).catch(console.error);
								}
							});
					})
					.catch(console.error);
			}
		});
});

router.post('/races/announce', (req, res) => {
	var raceId = req.body.id;
	db.get().collection("tourney-events")
		.findOne({"_id": db.oid(raceId)}, (err, race) => {
			if (!err) {
				if (race && race.srtvRace && race.srtvRace.guid) {
					// check if race info was already fetched
					if (race.srtvRace.announcements) {
						sendRaceAnnouncements(race.srtvRace, res);
					} else {
						updateSRTVRace(raceId, race.srtvRace.guid)
							.then(updatedRace => {
								sendRaceAnnouncements(updatedRace, res);
							})
							.catch(console.error);	
					}
				}
			} else {
				res.status(500).send({"error": err});
				console.error(err);
			}
		});
});

router.post('/races/discordPing', (req, res) => {
	var raceId = req.body.id;

	// Set up Discord client
	const client = new DISCORD.Client();
	// Wait for bot to be ready before watching streams/races
	client.on('ready', () => {
		console.log('Connected to discord');
		/*db.get().collection("tourney-events")
			.findOne({"_id": db.oid(raceId)}, (err, race) => {
				if (!err) {
					if (race) {
						let pingUsers = [];
						if (race.match1 && race.match1.players) {
							let match1Racers = parseRacers(race.match1.players);
							if (match1Racers.player1 !== null && match1Racers.player1.discordTag) {

							}
						}
						if (race.match2 && race.match2.players) {
							let match2Racers = parseRacers(race.match2.players);
						}
					}
				} else {
					res.status(500).send({"error": err});
					console.error(err);
				}
			});*/
		res.send({result: true});
	})
	.on('error', err => {
		res.status(500).send(err);
		console.error(err);
	})
	.login(req.app.locals.discord.token);
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

let restreamStatus = (channel) => {
	if (channel) {
  	if (channel.slug.match(/^speedgaming/)) {
  		return `<a href="https://twitch.tv/${channel.slug}" target="_blank">${channel.name}</a>`;
  	} else {
			return channel.name;
		}
	} else {
		return "<em>Undecided</em>";
	}
}

let updateSRTVRace = (raceId, guid) => {
	return new Promise((resolve, reject) => {
		console.log(`Fetching SRTV race info for ${guid} (${raceId})...`);
		SRTV.getRace(guid)
			.then(race => {
				console.log(`Race found, updating DB...`);
				db.get().collection("tourney-events")
					.update({"_id": db.oid(raceId)}, {$set: {"srtvRace": race}}, (err, result) => {
						if (err) {
							console.error('Unable to fetch race info from SRTV after creation: ', err);
							reject(err);
						} else {
							console.log(`Race updated`);
							resolve(race);
						}
					});
			})
			.catch(err => {
				reject(err);
			});
	});
}

let sendRaceAnnouncements = (race, res) => {
	console.log(`Sending announcements for race ${race.guid}...`);
	SRTV.say(race.announcements, raceAnnouncements)
		.then(sent => {
			res.send({});
			console.log("Sent.");
		})
		.catch(err => {
			res.status(500).send({"error": err});
			console.error(err);
		});
}

module.exports = router;