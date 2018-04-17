/*
 * This is a tool to facilitate race creation, discord pings, and filename generation
 * for the ALttP NMG Tourney
 */
const SG = require('./lib/speedgaming.js'),
  SRTV = require('./lib/srtv.js'),
  DISCORD = require('discord.js'),
  prompt = require('prompt');

let parseArgs = require('minimist')(process.argv.slice(2));

// Read in bot configuration
let config = require('./config.json');

let raceDefaults = {
	"category": "253d897e-3fc2-4cb1-945c-a24e6c423663",	// ALttP Any% NMG No S+Q
	"startupMode": "READY_UP",
	"ranked": false,
	"unlisted": true,
	"streamed": false
};

let announcements = [
	"Welcome, Racers!",
	"Reminder: Disable all alerts/overlays covering your game feed or timer and please use game audio only!",
	"Please choose a single character for your opponent to use for their filename ASAP."
];

let raceNamePrefix = "NMG Tourney";

// Set up Discord client
//const discord = new DISCORD.Client();
// Wait for bot to be ready before starting to listen
//discord.on('ready', () => {

	// Handle requests from the client
	

	/*let newRace = Object.assign(raceDefaults, {"name": "Test Race -- DO NOT JOIN"});

	console.log("Starting race creation...");

	SRTV.createRace(newRace)
		.then(raceGuid => {
			console.log(`Race '${newRace.name}' created successfully: ${raceGuid}`);
			console.log("Fetching race details...");
			SRTV.getRace(raceGuid)
				.then(race => {

					console.log("Sending announcements...");
					announcements.forEach((msg, index) => {
						SRTV.say(chatGuid, msg).catch(console.error);
					});*/
					/*SRTV.say(chatGuid, "Welcome, Racers!")
						.then(sent => {
							SRTV.say(chatGuid, "Reminder: Disable all alerts/overlays covering your game feed or timer and please use game audio only!")
								.then(sent => {
									SRTV.say(chatGuid, "Please choose a single character for your opponent to use for their filename ASAP.")
										.then(sent => {
											console.log("Finished announcements.");
										})
										.catch(console.error);
								})
								.catch(console.error);
						})
						.catch(console.error);*/
				/*})
				.catch(console.error);
		})
		.catch(console.error);*/
//})
// Log errors
//.on('error', console.error)
// Log the bot in
//.login(config.discord.token);

/*Automated Race Creation
-----------------------
Arguments:
- name
- racer usernames (discord)
- commentary usernames (discord)

Procedure:
- Create race, get GUID back.
- Ping users in discord.
- Fetch race details to get announcements chat GUID.
- Wait for prompt to send instructions...
- Send reminders / instructions once prompted
- Generate random filenames for each racer