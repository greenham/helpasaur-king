const express = require('express'),
  exphbs = require('express-handlebars'),
  handlebars = require('./helpers/handlebars.js')(exphbs),
  db = require('./db'),
  SRTV = require('./lib/srtv.js');

let config = require('./config.json');

const app = express();
const port = process.env.PORT || 3000;

// @TODO: make this not dumb
// app.locals.config = config;
app.locals.botName = config.botName;
app.locals.discord = config.discord;
app.locals.tourney = config.tourney;

// Use Handlebars for templating
app.engine('.hbs', handlebars.engine);
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