const request = require('request'),
  db = require('../db.js'),
  util = require('../lib/util.js');

let config = require('../config.json');

const challongeApiBaseUrl = `https://${config.challonge.username}:${config.challonge.apiKey}@api.challonge.com/v1/`,
	challongeApiBasePath = `tournaments/${config.challonge.tourneyId}/participants/`,
  userAgent = "alttp-tourney-seeder/1.0";


db.connect(config.db.host, config.db.db, (err) => {
	if (!err) {
		start();
	} else {
		console.error('Unable to connect to Mongo.');
		process.exit(1);
	}
});

const start = () => {
	db.get().collection("tourney-people")
		.aggregate([
			{"$match": {"inBrackets": true}},
			{"$addFields": {
				"bestGroupsTime": {"$min": "$groupsRaceTimes"},
				"averageGroupsTime": {"$avg": "$groupsRaceTimes"}
			}},
			{"$sort": {"bestGroupsTime": 1, "averageGroupsTime": 1}}
		])
		.toArray((err, people) => {
			if (err) {
				console.error(err);
			} else {
				// some dumb shit here to place dropouts at the bottom of the list
				let dropouts = [
					"5add1b4da5542065972435be", // Cransoon
					"5add1b4da554206597243629", // Zatox
					"5add1b4da5542065972435b3" // Benteezy
				];

				const reorder = async () => {
					let newList = [];
					let addAtEnd = [];
					let currentSeed = 1;
					let bottomSeed = 64;

					await util.asyncForEach(people, async (person, index) => {
						if (dropouts.includes(person._id.toString())) {
							person.seed = bottomSeed;
							addAtEnd.push(person);
							bottomSeed--;
						} else {
							person.seed = currentSeed;
							newList.push(person);
							currentSeed++;
						}
					});

					let finalList = newList.concat(addAtEnd);

					let pairings = [
						[1,64],
						[32,33],
						[17,48],
						[16,49],
						[9,56],
						[24,41],
						[25,40],
						[8,57],
						[4,61],
						[29,36],
						[20,45],
						[13,52],
						[12,53],
						[21,44],
						[28,37],
						[5,60],
						[2,63],
						[31,34],
						[18,47],
						[15,50],
						[10,55],
						[23,42],
						[26,39],
						[7,58],
						[3,62],
						[30,35],
						[19,46],
						[14,51],
						[11,54],
						[22,43],
						[27,38],
						[6,59],
					];

					let finalFinalList = [];
					let newSeed = 0;
					for (let i = 0; i < 32; i++) {
						let nextPart = Object.assign(finalList.find(e => {return e.seed == pairings[i][0]}), {newSeed: ++newSeed});
						finalFinalList.push(nextPart);

						let nextPart2 = Object.assign(finalList.find(e => {return e.seed == pairings[i][1]}), {newSeed: ++newSeed});
						finalFinalList.push(nextPart2);
					}

					// Update seeds on challonge
					const startUpdate = async (cb) => {
						await util.asyncForEach(finalFinalList, async (participant) => {
							try {
								await updateParticipantSeed(participant);
							} catch (e) {
								console.error(e);
							}
						});
						cb();
					}

					startUpdate(() => {console.log('Update finished')});
				};

				reorder();
			}
		});

	function updateParticipantSeed(participant) {
		return new Promise((resolve, reject) => {
			let participantReq = {
				url: challongeApiBaseUrl+challongeApiBasePath+participant.challongeId+'.json',
				method: 'PUT',
				headers: {'User-Agent': userAgent},
				body: {seed: participant.newSeed},
				json: true
			};

			console.log(`Update would set ${participant.challongeUsername} (${participant.challongeId}) to seed ${participant.newSeed}`)

			resolve(true);

			//console.log(participantReq);

			/*request(participantReq, function(error, response, body) {
			  if (!error && response.statusCode == 200) {
			    console.log(`Updated seed for ${participant.challongeUsername} to ${participant.seed}`);
			  	resolve(true);
			  } else {
			  	console.log(`Received statusCode ${response.statusCode} from challonge: `, error, body);
			  	reject(error);
			  }
			});*/
		});
	}
}

// catch Promise errors
process.on('unhandledRejection', console.error);