const schedule = require('node-schedule'),
	SG = require('./lib/speedgaming.js'),
	moment = require('moment-timezone'),
	MongoClient = require('mongodb').MongoClient,	
  mongoServer = "mongodb://127.0.0.1:27017/",
  mongoDBName = "alttpbot";


const updateEventScheduleJob = schedule.scheduleJob('*/15 * * * *', () => {
	console.log(`[${moment().format()}] Fetching upcoming events for alttp from SpeedGaming...`);

	try {
		MongoClient.connect(mongoServer, (err, db) => {
			if (err) throw err;
			dbo = db.db(mongoDBName);

			SG.upcoming('alttp', {days: 2})
				.then(events => {
					console.log(`Found ${events.length} scheduled within the next 2 days... updating local cache`);
					events.forEach((event, index) => {
						event.lastUpdated = moment().format();
						dbo.collection("tourney-events").update({"id": event.id}, event, {upsert: true}, (err, res) => {
							if (err) throw err;
							console.log(`Updated event ${event.id}`);
							db.close();
						});
					});
				})
				.catch(console.error);
		});
	} catch (e) {
		console.error(e);
	}
});
console.log(`Scheduled updateEventSchedule for: ${updateEventScheduleJob.nextInvocation()}`);