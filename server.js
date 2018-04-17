const express = require('express'),
  Handlebars = require('express-handlebars'),
  moment = require('moment-timezone');

let config = require('./config.json');

const app = express();
const port = process.env.PORT || 3000;

app.locals.botName = config.botName;


const hbs = Handlebars.create({
	defaultLayout: 'main',
	extname: '.hbs',
	helpers: {
		localize: (time) => {
			// @TODO: determine the user's timezone? might not be possible until after the req object is available
			return moment(time).tz("America/Los_Angeles").calendar();
		}
	}
});
app.engine('.hbs', hbs.engine);
app.set('view engine', '.hbs');

app.use(express.static('public'));

app.get('/', (req, res) => {
	res.render('index');
});

const tourney = require('./routes/tourney.js');
app.use('/tourney', tourney);

app.listen(port, () => {
	console.log(`Listening on port ${port}`);
});