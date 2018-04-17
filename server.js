const express = require('express'),
  Handlebars = require('express-handlebars'),
  moment = require('moment-timezone'),
  db = require('./db'),
  SRTV = require('./lib/srtv.js');

let config = require('./config.json');

const app = express();
const port = process.env.PORT || 3000;

app.locals.botName = config.botName;

// Set up the template engine (Handlebars)
const hbs = Handlebars.create({
	defaultLayout: 'main',
	extname: '.hbs',
	helpers: {
		localize: (time) => {
			// @TODO: determine the user's timezone? might not be possible until after the req object is available
			return moment(time).tz("America/Los_Angeles").calendar();
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


app.use(express.json());
app.use(express.urlencoded({extended: true}));

// Homepage
app.get('/', (req, res) => {
	res.render('index');
});

// Tourney Routes
const tourney = require('./routes/tourney.js');
app.use('/tourney', tourney);

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
})