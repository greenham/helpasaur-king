const schedule = require('node-schedule'),
	db = require('./db'),
	tasks = require('./lib/tasks.js');

db.connect('mongodb://127.0.0.1:27017/alttpbot', (err) => {
	if (err) {
		console.error('Unable to connect to Mongo.');
		process.exit(1);
	} else {
		scheduleJobs();
	}
});

let scheduleJobs = () => {
	const refreshSpeedgamingEventsJob = schedule.scheduleJob('*/15 * * * *', () => {tasks.refreshSpeedgamingEvents()});
	console.log(`Scheduled task 'refreshSpeedgamingEvents' for: ${refreshSpeedgamingEventsJob.nextInvocation()}`);
}