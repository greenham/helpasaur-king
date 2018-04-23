const	db = require('./db.js'),
  util = require('./lib/util.js');

let config = require('./config.json');

db.connect(config.db.host, config.db.db, (err) => {
	if (!err) {
		/*mergePeople().then(foundCount => {
			console.log(`Found ${foundCount}`);*/

		importGroupsTimes().then(processedCount => {
			console.log(`Processed ${processedCount}`);
			/*db.close((err) => {
				if (err) console.error(err)
			});*/
		}).catch(console.error);
	} else {
		console.error('Unable to connect to Mongo.');
		process.exit(1);
	}
});

function mergePeople()
{
	return new Promise((resolve, reject) => {
		let people = require('./conf/people.json'); // SG list
		let participants = require('./conf/participants.json'); // tourney-seeder list

		let peopleMap = {
			4755: "mikethev",
			1285: "Mysticum",
			4598: "SpaceKatUniverse",
			3291: "SprSuperplayer2",
			4520: "TGH",
			5416: "Z4T0X"
		};

		// try to match via usernames
		// manually map everything else
		const start = async () => {
			let foundCount = 0;
			await util.asyncForEach(people, async (person) => {
				let foundParticipant = null;

				// see if they're manually mapped
				if (peopleMap.hasOwnProperty(person.speedgamingId)) {
					foundParticipant = searchParticipants(participants, peopleMap[person.speedgamingId].toLowerCase().trim());
				} else {
					// try to match by displayname first
					if (person.displayname) {
						foundParticipant = searchParticipants(participants, person.displayname.toLowerCase().trim());

						// try publicstream next
						if (!foundParticipant && person.publicstream) {
							foundParticipant = searchParticipants(participants, person.publicstream.toLowerCase().trim());
						}

						// discordtag last
						if (!foundParticipant && person.discordtag) {
							foundParticipant = searchParticipants(participants, person.discordtag.split('#')[0].toLowerCase().trim());
						}
					}
				}

				if (foundParticipant) {
					foundCount++;
					console.log(`Search for ${person.speedgamingId} yielded ${foundParticipant.srcUsername}`);

					// MERGE
					let merged = {
						"speedgamingId": parseInt(person.speedgamingId),
						"challongeId": parseInt(foundParticipant.challongeId),
						"challongeUsername": foundParticipant.challongeUsername,
						"srcUsername": foundParticipant.srcUsername,
						"discordTag": person.discordtag,
						"pb": parseInt(foundParticipant.pb),
						"displayName": person.displayname,
						"streams": {
							"default": {
								"service": "twitch",
								"username": person.publicstream || person.displayname,
								"alt": false
							}
						}
					};

					db.get().collection("tourney-people").insert(merged, (err, res) => {
						if (!err) {
							console.log(`Created new person for ${merged.speedgamingId}`);
						} else {
							console.error(err);
						}
					});
				} else {
					console.error(`No match for ${person.speedgamingId}!`);
				}
			});

			resolve(foundCount);
		};

		start();
	});
}

function searchParticipants(participants, searchName)
{
	return participants.find(e => {
		if (
			e.srcUsername.toLowerCase() === searchName
			|| e.challongeUsername.toLowerCase() === searchName
		) {
			return e;
		}
	});
}

function importGroupsTimes()
{
	return new Promise((resolve, reject) => {
		// pull in the file
		let groupsTimes = require('./conf/participants-groups-times.json');

		const start = async () => {
			let processedCount = 0;
			await util.asyncForEach(groupsTimes, async (entry) => {
				processedCount++;
				// find the matching person in the DB
				db.get().collection("tourney-people").findOne({"challongeId": entry.challongeId}, (err, person) => {
					if (!err && person) {
						let update = {"$set": {
							"groupsRaceTimes": entry.raceTimes,
							"groupsRecord": {"wins": entry.wins, "losses": entry.losses}
						}};

						db.get().collection("tourney-people")
							.update({"_id": db.oid(person._id)}, update, (err, res) => {
								if (err) {
									console.error(err);
								}
							});
					} else if (err) {
						console.error(err);
					} else {
						console.error(`No person matching this challongeId: ${entry.challongeId}`);
					}
				});
			});

			resolve(processedCount);
		};

		start();
	});
}