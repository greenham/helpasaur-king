const SG = require('./speedgaming.js'),
	moment = require('moment-timezone'),
	db = require('../db'),
	util = require('./util.js');

let refreshSpeedgamingEvents = (event, interval) => {
	event = event || 'alttp';
	interval = interval || {days: 3};

	return new Promise((resolve, reject) => {
		console.log(`[${moment().format()}] Fetching upcoming events for '${event}' from SpeedGaming...`);

		SG.upcoming(event, interval)
			.then(events => {
				console.log(`Found ${events.length} upcoming events for '${event}'... updating local cache`);

				const start = async () => {
					await util.asyncForEach(events, async (event) => {
						event.lastUpdated = moment().format();

						// check for existing record, update necessary fields
						db.get().collection("tourney-events")
							.findOne({"id": event.id}, (err, race) => {
								if (!err) {
									// insert new doc if none exists
									if (race === null) {
										db.get().collection("tourney-events").insert(event, (err, res) => {
											if (!err) {
												console.log(`Created new event ${event.id}`);
											} else {
												console.error(err);
											}
										});
									} else {
										// update specific fields in existing record (so we don't overwrite ones we've inserted after initial fetch)
										let update = {$set: event};
										db.get().collection("tourney-events").update({"_id": db.oid(race._id)}, update, (err, res) => {
											if (!err) {
												console.log(`Updated event ${event.id}`);
											} else {
												console.error(err);
											}
										});
									}
								} else {
									console.error(err);
								}
							});
					});
					resolve(true);
				};

				start();
			})
			.catch(reject);
	});
};

module.exports = {
	refreshSpeedgamingEvents: refreshSpeedgamingEvents
};