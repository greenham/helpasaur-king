const express = require('express'),
  Handlebars = require('express-handlebars'),
  moment = require('moment-timezone'),
  db = require('./db'),
  SRTV = require('./lib/srtv.js');

let config = require('./config.json');

const app = express();
const port = process.env.PORT || 3000;

app.locals.botName = config.botName;
app.locals.discord = config.discord;
app.locals.tourney = config.tourney;

// Set up the template engine (Handlebars)
const hbs = Handlebars.create({
	defaultLayout: 'main',
	extname: '.hbs',
	helpers: {
		localize: (time) => {
			// @TODO: determine the user's timezone? might not be possible until after the req object is available
			return moment(time).tz("America/Los_Angeles").format('LLLL');
		},
		calendarize: (time) => {
			return moment(time).tz("America/Los_Angeles").calendar();
		},
		timeago: (time) => {
			return `<time class="timeago" datetime="${moment(time).format()}">${moment(time).calendar()}</time>`;
		},
		srtvUrl: (guid) => {
			return SRTV.raceUrl(guid);
		}
	}
});
app.engine('.hbs', hbs.engine);
app.set('view engine', '.hbs');

// Routing for static files
app.use(express.static('public'));

// Easy form request parsing
app.use(express.json());
app.use(express.urlencoded({extended: true}));

// Homepage
app.get('/', (req, res) => {res.render('index')});

// Routes
app.use('/tourney', require('./routes/tourney.js'));
app.use('/discord', require('./routes/discord.js'));
app.use('/srtv', require('./routes/srtv.js'));
app.use('/twitch', require('./routes/twitch.js'));
app.use('/settings', require('./routes/settings.js'));

// Connect to Mongo and start listening on the configured port
// @TODO: Move url to config
db.connect('mongodb://127.0.0.1:27017/alttpbot', (err, db) => {
	if (err) {
		console.error('Unable to connect to Mongo.');
		process.exit(1);
	} else {
		app.listen(port, () => {
			console.log(`Listening on port ${port}`);
		});
	}
});