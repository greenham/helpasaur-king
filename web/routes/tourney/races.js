const express = require('express'),
  router = express.Router(),
  DISCORD = require('discord.js'),
  moment = require('moment-timezone'),
  async = require('async'),
  db = require('../../db'),
  SG = require('../../lib/speedgaming.js'),
  SRTV = require('../../lib/srtv.js'),
  tasks = require('../../lib/tasks.js'),
  util = require('../../lib/util.js');

// Manage Race
router.get('/:id', (req, res) => {
	db.get().collection("tourney-events")
		.findOne({"_id": db.oid(req.params.id)}, (err, race) => {
			if (err) {
				console.error(err);
				res.send({"error": err});
			} else {
				insetPeople(race).then(race => {
					insetRaceResults(race).then(race => {
						race.racers = getRacersFromRace(race);
						res.render('tourney/race', {race: race});
					});
				}).catch(console.error);
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
			let raceName = `${raceNamePrefix}${racers}`;
			let newRace = Object.assign(tourneyConfig.srtvRaceDefaults, {"name": raceName});

			console.log(`Creating race on SRTV: '${newRace.name}'`);

			SRTV.createRace(newRace)
			.then(raceGuid => {
				console.log(`Race created successfully: ${raceGuid}`);

				// store guid of race in DB
				db.get().collection("tourney-events")
				.update({"_id": db.oid(raceId)}, {$set: {"srtvRace": {"guid": raceGuid}}}, (err, result) => {
					if (!err) {
						res.send({"raceLink": SRTV.raceUrl(raceGuid)});
						// update race details
						tasks.updateSRTVRace(raceId, raceGuid).catch(console.error);
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
		return res.status(500).send("No default announcements configured! Check tourney config!");
	}

	var raceId = req.body.id;

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
		// Make sure announcements chat exists
		if (!race.srtvRace.announcements) {
			return res.status(400).send("No announcements channel to post to on SRTV! Sync the SRTV race first!");
		}
	
		console.log(`Sending announcements for race ${race.srtvRace.guid}...`);
		SRTV.say(race.srtvRace.announcements, tourneyConfig.raceAnnouncements)
		.then(sent => {
			res.send({sent: true});
		})
		.catch(err => {
			console.error(err);
			res.status(500).send(err);
		});
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
		return res.status(500).send("Discord/tourney has not been configured!");
	}

	var raceId = req.body.id;
	const client = new DISCORD.Client();

	db.get().collection("tourney-events")
	.findOne({"_id": db.oid(raceId)}, (err, race) => {
		if (err) {
			console.error(err);
			return res.status(500).send(err);
		}
		if (!race) {
			return res.status(404).send("No race found matching this ID");
		}

		insetPeople(race).then(race => {
			client.on('ready', () => {
				let pingUsers = getDiscordUsersFromRace(race);

				pingUsers = pingUsers.map((e, i, a) => {
					if (e) {
						// if it's an ID, return
						if (e.match(/^\d+$/)) return e;

						// lookup ID from tag otherwise
						let foundUser = client.users.find('tag', e);
						if (foundUser) {
							return foundUser.id;
						} else {
							// no match for this user in Discord, maybe renamed
							// just return the tag
							return e;
						}
					} else {
						// no match found, remove from pings
						a.splice(i, 1);
					}
				});

				// find the correct text channel in the correct guild to send the message
				let guild = client.guilds.find('id', tourneyConfig.racePings.guildId);
				let notificationChannel = guild.channels.find('name', tourneyConfig.racePings.textChannelName);

				// construct and send the message
				let message = pingUsers.map(e => {return `<@${e}>`}).join(' ')
				+ ` Here is the channel for the race starting ${moment(race.when).fromNow()}:`
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
			})
			.on('error', err => {
				console.error(err);
				res.status(500).send(err);
			})
			.login(discordConfig.token);
		});
	});
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
		// Make sure announcements chat exists
		if (!race.srtvRace.announcements) {
			res.status(400).send("No announcements channel to post to on SRTV! Sync the SRTV race first!");
			return;
		}
		// Make sure filenames have been generated
		if (!race.filenames) {
			res.status(400).send("Filenames have not been generated yet!");
			return;
		}
		
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

			tasks.updateSRTVRace(raceId, race.srtvRace.guid)
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
// Start by creating some models to encapsulate some of this functionality
let getDiscordUsersFromRace = (race) => {
	let people = getPeopleFromRace(race);
	return getDiscordTags(people);
};

let getDiscordTags = (players) => {
	return players.map(e => {
		// check the person object first, if it exists
		let tag = null;

		if (e.person) {
			tag = e.person.discordId || e.person.discordTag || null;
		}

		// see if it's embedded directly in this object otherwise
		if (tag === null) {
			tag = e.discordId || e.discordTag || null;
		}
		
		return tag;
	});
};

let getPeopleFromRace = (race) => {
	return getRacersFromRace(race).concat(getCommentatorsFromRace(race));
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

let getCommentatorsFromRace = (race) => {
  if (race.commentators) {
  	return race.commentators;
  } else {
  	return [];
  }
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

let getPersonBySpeedgamingEntry = (entry) => {
	return new Promise((resolve, reject) => {
		db.get().collection("tourney-people")
		.findOne({"$or": [{"speedgamingId": entry.id}, {"displayName": entry.displayName}]}, (err, res) => {
			if (!err) {
				resolve(res);
			} else {
				reject(err);
			}
		});
	});
};

let getRacesBySpeedgamingEntry = (entry) => {
	return new Promise((resolve, reject) => {
		db.get().collection('tourney-events')
		.aggregate([
		  {$match: {
		    deleted: {$ne: true},
		    srtvRace: {$ne: null},
		    when: {$gte: "2018-05-01T00:00:00+00:00"},
		    $or: [
		    	{"match1.players.displayName": entry.displayName},
		    	{"match2.players.displayName": entry.displayName}
		    ]
		  }},
		  {$project: {"started": "$srtvRace.started", "entries": "$srtvRace.entries.entries", "name": "$srtvRace.name", "guid": "$srtvRace.guid"}},
		  {$sort: {when: 1}}
		])
		.toArray((err, races) => {
			if (err) {
				reject(err);
			}
			resolve(races);
		});
	});
};

// a function that insets values from tourney-people with the race itself
let insetPeople = (race) => {
	return new Promise((resolve, reject) => {
		let aTasks = [];

		if (race.match1 && race.match1.players) {
			aTasks.push((callback) => {
				async.forEachOf(race.match1.players, (value, index, cb) => {
					getPersonBySpeedgamingEntry(value)
					.then(person => {
						race.match1.players[index].person = person;
						cb();
					})
					.catch(cb);
				}, callback);
			});
		}

		if (race.match2 && race.match2.players) {
			aTasks.push((callback) => {
				async.forEachOf(race.match2.players, (value, index, cb) => {
					getPersonBySpeedgamingEntry(value)
					.then(person => {
						race.match2.players[index].person = person;
						cb();
					})
					.catch(cb);
				}, callback);
			});
		}

		if (race.commentators) {
			aTasks.push((callback) => {
				async.forEachOf(race.commentators, (value, index, cb) => {
					getPersonBySpeedgamingEntry(value)
					.then(person => {
						race.commentators[index].person = person;
						cb();
					})
					.catch(cb);
				}, callback);
			});
		}

		async.parallel(async.reflectAll(aTasks), (err, results) => {
			if (err) reject(err);
			resolve(race);
		});
	});
};

let insetRaceResults = (race) => {
	// pull in SRTV race results for each racer
	return new Promise((resolve, reject) => {
		let aTasks = [];

		if (race.match1 && race.match1.players) {
			aTasks.push((callback) => {
				async.forEachOf(race.match1.players, (value, index, cb) => {
					getRacesBySpeedgamingEntry(value)
					.then(races => {
						race.match1.players[index].races = races;
						cb();
					})
					.catch(cb);
				}, callback);
			});
		}

		if (race.match2 && race.match2.players) {
			aTasks.push((callback) => {
				async.forEachOf(race.match2.players, (value, index, cb) => {
					getRacesBySpeedgamingEntry(value)
					.then(races => {
						race.match2.players[index].races = races;
						cb();
					})
					.catch(cb);
				}, callback);
			});
		}

		async.parallel(async.reflectAll(aTasks), (err, results) => {
			if (err) reject(err);
			resolve(race);
		});
	});
};

module.exports = router;