const express = require('express'),
  exphbs = require('express-handlebars'),
  handlebars = require('./helpers/handlebars.js')(exphbs),
  db = require('./db'),
  bodyParser = require('body-parser'),
  expressSanitizer = require('express-sanitizer');

let config = require('./config.json');

const app = express();
const port = process.env.PORT || config.webapp.port || 3000;

// Make app config available everywhere
app.locals.config = config;

// Use Handlebars for templating
app.engine('.hbs', handlebars.engine);
app.set('view engine', '.hbs');

// Easy form request parsing
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

// Sanitize form inputs
app.use(expressSanitizer());

// Routing for static files
app.use(express.static('public'));

// Routing for everything else
app.use(require('./routes'));

// Connect to Mongo and start listening on the configured port
if (!config.db || !config.db.host || !config.db.db) {
	console.error("Database has not been properly configured -- check config.json!");
	process.exit(1);
}

db.connect(config.db.host, config.db.db, (err) => {
	if (!err) {
		app.listen(port, () => {
			console.log(`Listening on port ${port}`);
		});
	} else {
		console.error('Unable to connect to Mongo.');
		process.exit(1);
	}
});