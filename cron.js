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

		SG.upcoming('alttp', {days: 2})
			.then(events => {
				console.log(`Found ${events.length} scheduled within the next 2 days... updating local cache`);
				events.forEach((event, index) => {
					event.lastUpdated = moment().format();
					db.get().collection("tourney-events").update({"id": event.id}, event, {upsert: true}, (err, res) => {
						if (err) throw err;
						console.log(`Updated event ${event.id}`);
					});
				});
			})
			.catch(console.error);
	});
	console.log(`Scheduled updateEventSchedule for: ${updateEventScheduleJob.nextInvocation()}`);
}