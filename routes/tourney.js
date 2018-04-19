const express = require('express'),
  router = express.Router(),
  DISCORD = require('discord.js'),
  moment = require('moment-timezone'),
  db = require('../db'),
  SG = require('../lib/speedgaming.js'),
  SRTV = require('../lib/srtv.js'),
  tasks = require('../lib/tasks.js'),
  util = require('../lib/util.js');

// Tourney Schedule
router.get(['/', '/upcoming', '/recent', '/today'], (req, res) => {
	// Determine start/end/sort based on URL
	let start, end, sort, headerText;
	switch(req.path.slice(1, req.path.length)) {
		case "upcoming":
			start = moment().tz("UTC").subtract({hours: 2}).format();
  		end = moment().tz("UTC").add({days: 3}).format();
  		headerText = "Upcoming";
			break;
		case "recent":
			start = moment().tz("UTC").subtract({days: 7}).format();
  		end = moment().tz("UTC").format();
  		sort = {when: -1};
  		headerText = "Recent";
			break;
		case "":
		case "today":
		default:
			start = moment().startOf('day').tz("UTC").format();
			end = moment().endOf('day').tz("UTC").format();
			headerText = "Today's";
			break;
	}

	getRaces(start, end, sort)
		.then(events => {
			res.render('tourney/schedule', {
				pageHeader: `${headerText} Races`,
				events: events
			});
		})
		.catch(err => {
			console.error(err);
			// @TODO: render schedule page with error
		});
});

// Manage Race
router.get('/races/:id', (req, res) => {
	db.get().collection("tourney-events")
		.findOne({"_id": db.oid(req.params.id)}, (err, result) => {
			if (err) {
				console.error(err);
				res.send({"error": err});
				// @TODO: render race page with error
			} else {
				res.render('tourney/race', {race: result});
			}
		});
});

// Create Race
router.post('/races', (req, res) => {
	// @TODO: Validate tourney config
	if (typeof req.app.locals.tourney.srtvRaceDefaults === "undefined") {
		res.status(500).send({"error": "SRTV race defaults are not configured!"});
		return;
	}

	let raceNamePrefix = req.app.locals.tourney.raceNamePrefix || "";

	var raceId = req.body.id;
	db.get().collection("tourney-events")
		.findOne({"_id": db.oid(raceId)}, (err, race) => {
			if (err) {
				res.send('Error!');
				console.error(err);
			} else {
				// create race via SRTV
				let racers = getMatchesText(race);
				let raceName = `${req.app.locals.tourney.raceNamePrefix} | ${racers}`;
				let newRace = Object.assign(req.app.locals.tourney.srtvRaceDefaults, {"name": raceName});

				console.log(`Creating race on SRTV '${newRace.name}'`);

				SRTV.createRace(newRace)
					.then(raceGuid => {
						console.log(`Race created successfully: ${raceGuid}`);

						// store guid of race in DB
						db.get().collection("tourney-events")
							.update({"_id": db.oid(raceId)}, {$set: {"srtvRace": {"guid": raceGuid}}}, (err, result) => {
								if (!err) {
									res.send({"raceLink": SRTV.raceUrl(raceGuid)})
									updateSRTVRace(raceId, raceGuid).catch(console.error);
								} else {
									res.status(500).send({"error": err});
								}
							});
					})
					.catch(console.error);
			}
		});
});

// "Delete" Race
router.delete('/races', (req, res) => {
	var raceId = req.body.id;

	db.get().collection("tourney-events")
		.findOne({"_id": db.oid(raceId)}, (err, race) => {
			if (!err) {
				if (race) {
					// don't actually delete, just set to "deleted"
					db.get().collection("tourney-events")
						.update({"_id": db.oid(raceId)}, {$set: {"deleted": true}}, (err, result) => {
							if (!err) {
								res.send({});
							} else {
								res.status(500).send({"error": err});
								console.error(err);
							}
						});
				} else {
					res.status(404).send({"error": `No race found matching this ID: ${raceId}`});
				}
			} else {
				res.status(500).send({"error": err});
				console.error(err);
			}
		});
});

// Send Default SRTV Race Announcements
router.post('/races/announce', (req, res) => {
	let defaultAnnouncements = req.app.locals.tourney.raceAnnouncements || false;
	if (!defaultAnnouncements) {
		res.status(500).send({"error": "No default announcements configured! Check config.json"});
	}

	var raceId = req.body.id;
	db.get().collection("tourney-events")
		.findOne({"_id": db.oid(raceId)}, (err, race) => {
			if (!err) {
				if (race && race.srtvRace && race.srtvRace.guid) {
					updateSRTVRace(raceId, race.srtvRace.guid)
						.then(updatedRace => {
							if (updatedRace.announcements) {
								console.log(`Sending announcements for race ${updatedRace.guid}...`);
								SRTV.say(updatedRace.announcements, defaultAnnouncements)
									.then(sent => {
										res.send({sent: true});
									})
									.catch(err => {
										console.error(err);
										res.status(500).send({"error": err});
									});
								}
						})
						.catch(console.error);	
				}
			} else {
				res.status(500).send({"error": err});
				console.error(err);
			}
		});
});

// Send Discord Pings to Racers + Commentators
router.post('/races/discordPing', (req, res) => {
	// check config first
	if (!req.app.locals.discord.token || !req.app.locals.tourney.racePings.guildId || !req.app.locals.tourney.racePings.textChannelName) {
		console.error("/races/discordPing: discord is not configured properly - check config.json");
		res.status(500).send({"error": "Discord has not been configured! Check config.json"});
		return;
	}

	var raceId = req.body.id;

	// Set up Discord client
	const client = new DISCORD.Client();
	client.on('ready', () => {
		db.get().collection("tourney-events")
			.findOne({"_id": db.oid(raceId)}, (err, race) => {
				if (!err) {
					if (race) {
						let pingUsers = getDiscordUsersFromRace(race);

						pingUsers = pingUsers.map(e => {
							// if it's an ID, return
							if (e.match(/^\d+$/)) return e;

							// lookup ID from tag otherwise
							return client.users.find('tag', e).id;
						});

						// find the correct text channel in the correct guild to send the message
						let guild = client.guilds.find('id', req.app.locals.tourney.racePings.guildId);
						let notificationChannel = guild.channels.find('name', req.app.locals.tourney.racePings.textChannelName);

						// construct and send the message
						let message = pingUsers.map(e => {return `<@${e}>`}).join(' ')
							+ ` Here is the race channel for the upcoming race starting ${moment(race.when).fromNow()}:`
							+ ` <${SRTV.raceUrl(race.srtvRace.guid)}>`;

						// SEND
						console.log(`Sending race pings via Discord: ${message}`);
						notificationChannel.send(message)
							.then(sentMessage => {
								res.send({sent: sentMessage.content});
							})
							.catch(err => {
								res.status(500).send({"error": err});
								console.error(err);
							}).then(() => {client.destroy()});
					} else {
						res.status(404).send({"error": "No race found matching this ID"});
					}
				} else {
					console.error(err);
					res.status(500).send({"error": err});
				}
			});
	})
	.on('error', err => {
		console.error(err);
		res.status(500).send({"error": err});
	})
	.login(req.app.locals.discord.token);
});

// Generate Random Filenames for Racers
router.post('/races/filenames', (req, res) => {
	// get race ID from post
	var raceId = req.body.id;
	// fetch race from database
	db.get().collection("tourney-events")
		.findOne({"_id": db.oid(raceId)}, (err, race) => {
			if (!err) {
				if (race) {
					// generate a random filename for each racer
					let choices = util.range('A', 'Z');
					let racers = getRacersFromRace(race);
					let generateFilenames = async () => {
						let filenames = [];
						await util.asyncForEach(racers, async (racer) => {
							filenames.push({
								"racerId": racer.id,
								"racerName": racer.displayName,
								"filename": util.randElement(choices)
							});
						});

						// store filenames with race
						db.get().collection("tourney-events")
							.update({"_id": db.oid(raceId)}, {$set: {"filenames": filenames}}, (err, result) => {
								if (!err) {
									res.send(filenames);
								} else {
									res.status(500).send({"error": err});
								}
							});
					};
					generateFilenames();
				} else {
					res.status(404).send({"error": "No race found matching this ID"});
				}
			} else {
				console.error(err);
				res.status(500).send({"error": err});
			}
		});
});

// Send Filenames to SRTV Announcements
router.post('/races/sendFilenames', (req, res) => {
	// get race ID from post
	var raceId = req.body.id;
	// fetch race from database
	db.get().collection("tourney-events")
		.findOne({"_id": db.oid(raceId)}, (err, race) => {
			// Check for query errors
			if (err) {
				console.error(err);
				res.status(500).send({"error": "An error occurred during this request. It has been logged for further investigation."});
				return;
			}
			// Make sure this race exists
			if (!race) {
				res.status(404).send({"error": "No race found matching this ID"});
				return;
			}
			// Make sure a race channel exists
			if (!race.srtvRace || !race.srtvRace.guid) {
				res.status(400).send({"error": "Race channel does not exist yet!"});
				return;
			}
			// Make sure filenames have been generated
			if (!race.filenames) {
				res.status(400).send({"error": "Filenames have not been generated yet!"});
				return;
			}

			// Update SRTV race before proceeding
			updateSRTVRace(raceId, race.srtvRace.guid)
				.then(updatedRace => {
					if (updatedRace.announcements) {
						// construct messages
						let messages = race.filenames.map(e => {
							return `@${e.racerName}, your filename name is: ${e.filename}`;
						});

						// send messages
						SRTV.say(race.srtvRace.announcements, messages)
							.then(sent => {
								res.send({sent: true});
							})
							.catch(err => {
								console.error(err);
								res.status(500).send({"error": err});
							});
					} else {
						res.status(500).send({"error": "No announcements channel to post to on SRTV!"})
					}
				})
				.catch(console.error);
		});
});

// Send Individual Chat Messages to SRTV
router.post('/races/chat', (req, res) => {
	// get race ID, message from post
	// send via SRTV
});

// ez SG schedule refresh
router.get('/refresh', (req, res) => {
	tasks.refreshSpeedgamingEvents()
		.then(result => {
			res.send({"result": result});
		})
		.catch(console.error);
});

// @TODO: Find a better spot/method for these helper functions
let getRaces = (start, end, sort) => {
	sort = sort || {when: 1};

	return new Promise((resolve, reject) => {
		db.get().collection("tourney-events")
			.find({
				when: {$gte: start, $lte: end},
				deleted: {$ne: true}
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

let updateSRTVRace = (raceId, guid) => {
	return new Promise((resolve, reject) => {
		SRTV.getRace(guid)
			.then(race => {
				db.get()
					.collection("tourney-events")
					.update({"_id": db.oid(raceId)}, {$set: {"srtvRace": race}}, (err, result) => {
						if (err) reject(err);
						resolve(race);
					});
			})
			.catch(reject);
	});
};

let getDiscordUsersFromRace = (race) => {
	let discordUsers = [];
	if (race.match1 && race.match1.players) {
		discordUsers = discordUsers.concat(getDiscordTags(race.match1.players));
	}
	if (race.match2 && race.match2.players) {
		discordUsers = discordUsers.concat(getDiscordTags(race.match2.players));
	}
	if (race.commentators.length > 0) {
		discordUsers = discordUsers.concat(getDiscordTags(race.commentators));
	}
	return discordUsers;
};

let getDiscordTags = (players) => {
	return players.map(e => {
		return e.discordTag || e.discordId || null;
	});
};

let getRacersFromRace = (race) => {
	let racers = [];

	if (race.match1 && race.match1.players) {
		racers = racers.concat(race.match1.players);
	}
	if (race.match2 && race.match2.players) {
		racers = racers.concat(race.match2.players);
	}

	return racers;
};

let getMatchesText = (race) => {
	let ret = '';
	if (race.match1 && race.match1.players) {
		ret += `${race.match1.players[0].displayName} v ${race.match1.players[1].displayName}`;
	}

	if (race.match2 && race.match2.players) {
		ret += `. ${race.match2.players[0].displayName} v ${race.match2.players[1].displayName}`;
	}

	return ret;
};

module.exports = router;