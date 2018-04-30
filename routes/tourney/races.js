const express = require('express'),
  router = express.Router(),
  DISCORD = require('discord.js'),
  moment = require('moment-timezone'),
  db = require('../../db'),
  SG = require('../../lib/speedgaming.js'),
  SRTV = require('../../lib/srtv.js'),
  tasks = require('../../lib/tasks.js'),
  util = require('../../lib/util.js');

// Manage Race
router.get('/:id', (req, res) => {
	db.get().collection("tourney-events")
		.findOne({"_id": db.oid(req.params.id)}, (err, result) => {
			if (err) {
				console.error(err);
				res.send({"error": err});
			} else {
				getRacerInfoFromRace(result).then(racersInfo => {
					result.racers = racersInfo;
					res.render('tourney/race', {race: result});
				});
			}
		});
});

// Create Race
router.post('/', (req, res) => {
	// Validate tourney config
	let tourneyConfig = req.app.locals.config.tourney || false;
	if (!tourneyConfig || !tourneyConfig.srtvRaceDefaults) {
		res.status(500).send("SRTV race defaults are not configured!");
		return;
	}

	let raceNamePrefix = tourneyConfig.raceNamePrefix || "";

	var raceId = req.body.id;
	db.get().collection("tourney-events")
		.findOne({"_id": db.oid(raceId)}, (err, race) => {
			if (err) {
				console.error(err);
				res.status(500).send(err);
			} else {
				// create race via SRTV
				let racers = getMatchesText(race);
				let raceName = `${raceNamePrefix} ${racers}`;
				let newRace = Object.assign(tourneyConfig.srtvRaceDefaults, {"name": raceName});

				console.log(`Creating race on SRTV: '${newRace.name}'`);

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
									res.status(500).send(err);
								}
							});
					})
					.catch(console.error);
			}
		});
});

// "Delete" Race
router.delete('/', (req, res) => {
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
								console.error(err);
								res.status(500).send(err);
							}
						});
				} else {
					res.status(404).send(`No race found matching this ID: ${raceId}`);
				}
			} else {
				console.error(err);
				res.status(500).send(err);
			}
		});
});

// Send Default SRTV Race Announcements
router.post('/announce', (req, res) => {
	// Validate tourney config
	let tourneyConfig = req.app.locals.config.tourney || false;
	if (!tourneyConfig || !tourneyConfig.raceAnnouncements) {
		res.status(500).send("No default announcements configured! Check config.json");
		return;
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
								SRTV.say(updatedRace.announcements, tourneyConfig.raceAnnouncements)
									.then(sent => {
										res.send({sent: true});
									})
									.catch(err => {
										console.error(err);
										res.status(500).send(err);
									});
								}
						})
						.catch(console.error);	
				}
			} else {
				res.status(500).send(err);
				console.error(err);
			}
		});
});

// Send Discord Pings to Racers + Commentators
router.post('/discordPing', (req, res) => {
	// check config first
	let discordConfig = req.app.locals.config.discord || false;
	let tourneyConfig = req.app.locals.config.tourney || false;

	if (
		!discordConfig 
		|| !discordConfig.token
		|| !tourneyConfig 
		|| !tourneyConfig.racePings 
		|| !tourneyConfig.racePings.guildId 
		|| !tourneyConfig.racePings.textChannelName
	) {
		console.error("tourney/races/discordPing: discord/tourney is not configured properly - check config!");
		res.status(500).send("Discord/tourney has not been configured!");
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
						let guild = client.guilds.find('id', tourneyConfig.racePings.guildId);
						let notificationChannel = guild.channels.find('name', tourneyConfig.racePings.textChannelName);

						// construct and send the message
						let message = pingUsers.map(e => {return `<@${e}>`}).join(' ')
							+ ` Here is the race channel for the upcoming race starting ${moment(race.when).fromNow()}:`
							+ ` <${SRTV.raceUrl(race.srtvRace.guid)}>`;

						// SEND
						console.log(`Sending race pings via Discord to [${guild.name}]#${notificationChannel.name}: ${message}`);
						notificationChannel.send(message)
							.then(sentMessage => {
								res.send({sent: sentMessage.content});
							})
							.catch(err => {
								res.status(500).send(err);
								console.error(err);
							}).then(() => {client.destroy()});
					} else {
						res.status(404).send("No race found matching this ID");
					}
				} else {
					console.error(err);
					res.status(500).send(err);
				}
			});
	})
	.on('error', err => {
		console.error(err);
		res.status(500).send(err);
	})
	.login(discordConfig.token);
});

// Generate Random Filenames for Racers
router.post('/filenames', (req, res) => {
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
									res.status(500).send(err);
								}
							});
					};
					generateFilenames();
				} else {
					res.status(404).send("No race found matching this ID");
				}
			} else {
				console.error(err);
				res.status(500).send(err);
			}
		});
});

// Send Filenames to SRTV Announcements
router.post('/sendFilenames', (req, res) => {
	// get race ID from post
	var raceId = req.body.id;
	// fetch race from database
	db.get().collection("tourney-events")
		.findOne({"_id": db.oid(raceId)}, (err, race) => {
			// Check for query errors
			if (err) {
				console.error(err);
				res.status(500).send(err);
				return;
			}
			// Make sure this race exists
			if (!race) {
				res.status(404).send("No race found matching this ID");
				return;
			}
			// Make sure a race channel exists
			if (!race.srtvRace || !race.srtvRace.guid) {
				res.status(400).send("Race channel does not exist yet!");
				return;
			}
			// Make sure filenames have been generated
			if (!race.filenames) {
				res.status(400).send("Filenames have not been generated yet!");
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
								res.status(500).send(err);
							});
					} else {
						res.status(500).send("No announcements channel to post to on SRTV!");
					}
				})
				.catch(err => {
					console.error(err);
					res.status(500).send(err);
				});
		});
});

router.post('/srtvSync', (req, res) => {
	// get race ID from post
	var raceId = req.body.id;
	// fetch race from database
	db.get().collection("tourney-events")
		.findOne({"_id": db.oid(raceId)}, (err, race) => {
			// Check for query errors
			if (err) {
				console.error(err);
				return res.status(500).send(err);
			}
			// Make sure this race exists
			if (!race) {
				return res.status(404).send("No race found matching this ID");
			}
			// Make sure a race channel exists
			if (!race.srtvRace || !race.srtvRace.guid) {
				return res.status(400).send("Race channel does not exist yet!");
			}

			updateSRTVRace(raceId, race.srtvRace.guid)
				.then(updatedRace => {
					if (updatedRace) {
						res.send(updatedRace);
					} else {
						throw new Error("SRTV race could not be updated!");
					}
				})
				.catch(err => {
					console.error(err);
					res.status(500).send(err);
				});
		});
});

// @TODO: Send Individual Chat Messages to SRTV
router.post('/chat', (req, res) => {
	// get race ID, message from post
	// send via SRTV
});

// @TODO: Find a better spot/method for these helper functions
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

let getRacerInfoFromRace = (race) => {
	let racers = getRacersFromRace(race);
	// @TODO: once SG IDs are reliable, change back to this method
	//let speedgamingIds = racers.map(e => e.id);
	let displayNames = racers.map(e => e.displayName);
	
	return new Promise((resolve, reject) => {
		db.get().collection("tourney-people")
			.find({"displayName": {"$in": displayNames}})
			.toArray((err, res) => {
				if (!err) {
					resolve(res);
				} else {
					reject(err);
				}
			});
	});
};

module.exports = router;