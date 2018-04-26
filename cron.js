const schedule = require('node-schedule'),
	db = require('./db'),
	tasks = require('./lib/tasks.js');

let config = require('./config.json');

db.connect(config.db.host, config.db.db, (err) => {
	if (!err) {
		scheduleJobs();
	} else {
		console.error('Unable to connect to Mongo.');
		process.exit(1);
	}
});

let scheduleJobs = () => {
	const refreshSpeedgamingEventsJob = schedule.scheduleJob('0 * * * *', () => {tasks.refreshSpeedgamingEvents('alttp')});
	console.log(`Scheduled task 'refreshSpeedgamingEvents' for: ${refreshSpeedgamingEventsJob.nextInvocation()}`);
}