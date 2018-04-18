const express = require('express'),
  router = express.Router(),
  SG = require('../lib/speedgaming.js'),
  SRTV = require('../lib/srtv.js'),
  DISCORD = require('discord.js'),
  moment = require('moment-timezone'),
  db = require('../db'),
  tasks = require('../lib/tasks.js');

const raceAnnouncements = [
	"Welcome, Racers!",
	"Reminder: Disable all alerts/overlays covering your game feed or timer and please use game audio only!",
	"If there is a restream, DO NOT READY UP until a broadcaster joins the race or lets you know it's okay to do so!",
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

//let guildId = "395628442017857536";	// NMG Tourney Discord
let guildId = "88301149672718336"; // Curing Chamber

//let guildPingChannel = "tourney-talk";
let guildPingChannel = "bot-testing";

// Upcoming Tourney Races
router.get(['/', '/upcoming'], (req, res) => {
	// Get the current time in UTC
  let start = moment().tz("UTC").subtract({hours: 2}).format();
  let end = moment().tz("UTC").add({days: 3}).format();

	fetchRaces(start, end)
		.then(events => {
			res.render('tourney/schedule', {
				pageHeader: "Upcoming Races",
				events: events,
				helpers: {
					decorateRacers: decorateRacers,
					parseCommentary: parseCommentary,
					restreamStatus: restreamStatus
				}
			});
		})
		.catch(console.error);
});

router.get('/recent', (req, res) => {
	// Get the current time in UTC
  let start = moment().tz("UTC").subtract({days: 7}).format();
  let end = moment().tz("UTC").format();

	fetchRaces(start, end)
		.then(events => {
			res.render('tourney/schedule', {
				pageHeader: "Recent Races",
				events: events,
				helpers: {
					decorateRacers: decorateRacers,
					parseCommentary: parseCommentary,
					restreamStatus: restreamStatus
				}
			});
		})
		.catch(console.error);
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

// Send SRTV Race Announcements
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

// Send Discord Pings to Racers + Commentators
router.post('/races/discordPing', (req, res) => {
	var raceId = req.body.id;

	// Set up Discord client
	const client = new DISCORD.Client();
	client.on('ready', () => {
		console.log('Connected to discord');
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
						let guild = client.guilds.find('id', guildId);
						let notificationChannel = guild.channels.find('name', guildPingChannel);

						// construct and send the message
						let message = pingUsers.map(e => {return `<@${e}>`}).join(' ')
							+ ` ${SRTV.raceUrl(race.srtvRace.guid)}`;

						// SEND
						console.log(`Sending message via Discord: ${message}`);
						notificationChannel.send(message)
							.then(sentMessage => {
								console.log('Sent!');
								res.send({sent: sentMessage.content});
							})
							.catch(err => {
								res.status(500).send({"error": err});
								console.error(err);
							});
					}
				} else {
					res.status(500).send({"error": err});
					console.error(err);
				}
			});
	})
	.on('error', err => {
		res.status(500).send({"error": err});
		console.error(err);
	})
	.login(req.app.locals.discord.token);
});

// ez refresh
router.get('/refresh', (req, res) => {
	tasks.refreshSpeedgamingEvents()
		.then(result => {
			res.send({"result": result});
		})
		.catch(console.error);
});

// @TODO: Find a better spot/method for these helper functions
let fetchRaces = (start, end) => {
	return new Promise((resolve, reject) => {
		db.get().collection("tourney-events")
			.find({
				when: {$gte: start, $lte: end},
				deleted: {$ne: true}
			})
			.sort({when: 1})
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
};

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
};

let getDiscordUsersFromRace = (race) => {
	let discordUsers = [];
	if (race.match1 && race.match1.players) {
		discordUsers = discordUsers.concat(extractDiscordTags(race.match1.players));
	}
	if (race.match2 && race.match2.players) {
		discordUsers = discordUsers.concat(extractDiscordTags(race.match2.players));
	}
	if (race.commentators.length > 0) {
		discordUsers = discordUsers.concat(extractDiscordTags(race.commentators));
	}
	return discordUsers;
};

let extractDiscordTags = (players) => {
	let res = [];
	let racers = parseRacers(players);
	if (racers.player1 !== null && (racers.player1.discordTag || racers.player1.discordId)) {
		let target = racers.player1.discordId || racers.player1.discordTag;
		res.push(target);
	}
	if (racers.player2 !== null && (racers.player2.discordTag || racers.player2.discordId)) {
		let target = racers.player2.discordId || racers.player2.discordTag;
		res.push(target);
	}
	return res;
};

// Handlebars Helpers
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
		ret += `<span class="racer">${parsed.player1.displayName}</span> <small>v</small> `;
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
	if (commentators === null || commentators.length === 0) { return '<span class="text-muted"><em>None</em></span>'; }
	let ret = '<span class="commentators">';
	ret += commentators.map(e => {
		return '<span' + ((!e.approved) ? 'class="text-warning"':'') + '>' + e.displayName + '</span>';
	}).join(', ');
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
		return '<span class="text-muted"><em>Undecided</em></span>';
	}
};

module.exports = router;