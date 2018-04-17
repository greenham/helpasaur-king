const express = require('express'),
  router = express.Router(),
  SG = require('../lib/speedgaming.js'),
  SRTV = require('../lib/srtv.js'),
  DISCORD = require('discord.js');

const raceAnnouncements = [
	"Welcome, Racers!",
	"Reminder: Disable all alerts/overlays covering your game feed or timer and please use game audio only!",
	"Please choose a single character for your opponent to use for their filename ASAP."
];

router.get('/', (req, res) => {
	res.render('tourney/index');
});

router.get('/schedule', (req, res) => {
	SG.upcoming('alttp', {days: 2})
		.then(events => {
			res.render('tourney/schedule', {
				events: events,
				helpers: {
					parseRacers: (players) => {
						if (players === null) { return ''; }
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
					},
					parseCommentary: (commentators) => {
						if (commentators === null || commentators.length === 0) { return '<p class="text-danger"><em>None</em></p>'; }
						let ret = '<p>';
						ret += commentators.map(e => e.displayName).join(', ');
						ret += '</p>';
						return ret;
					}
				}
			});
			//res.json(events);
		})
		.catch(err => {
			res.send("An error has occurred. Check the logs for more info.");
			console.error(err);
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

module.exports = router;