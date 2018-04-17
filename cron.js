const schedule = require('node-schedule'),
	SG = require('./lib/speedgaming.js'),
	moment = require('moment-timezone'),
	db = require('./db');

db.connect('mongodb://127.0.0.1:27017/alttpbot', (err) => {
	if (err) {
		console.error('Unable to connect to Mongo.');
		process.exit(1);
	} else {
		scheduleJobs();
	}
});

let scheduleJobs = () => {
	const updateEventScheduleJob = schedule.scheduleJob('*/15 * * * *', () => {
		console.log(`[${moment().format()}] Fetching upcoming events for alttp from SpeedGaming...`);

		SG.upcoming('alttp', {days: 3})
			.then(events => {
				console.log(`Found ${events.length} scheduled within the next 3 days... updating local cache`);
				events.forEach((event, index) => {
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
									// update specific fields in existing record
									let update = {
										$set: {
											match1: event.match1,
											match2: event.match2,
											commentators: event.commentators,
											when: event.when,
											channel: event.channel
										}
									};
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
			})
			.catch(console.error);
	});
	console.log(`Scheduled updateEventSchedule for: ${updateEventScheduleJob.nextInvocation()}`);
}