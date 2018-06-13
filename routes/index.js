const express = require('express'),
  router = express.Router(),
  passport = require('passport'),
  Account = require('../models/account'),
  staticCommands = require('../lib/commands.js');

// Homepage
router.get('/', (req, res) => {
	if (!req.user) {
		res.redirect('/login');
	} else {
		res.render('index')
	}
});

// Login page
router.get('/login', (req, res) => {
	if (req.user) {
		res.redirect('/');
	}

	res.render('login');
});

// Login POST
router.post('/login',
  passport.authenticate('local'),
  (req, res) => {
  	res.send({ result: true });
  }
);

// Logout
router.get('/logout', (req, res) => {
	req.logout();
	res.redirect('/');
});

// Command List
router.get('/commands', (req, res) => {
	res.render('commands', {commands: staticCommands.getCommandsInCategory('all')});
});

var isLoggedIn = (req, res, next) => {
	if (req.isAuthenticated()) {
		return next();
	} else {
		res.redirect('/login');
	}
}

// Routes
router.use('/tourney', isLoggedIn, require('./tourney.js'));
router.use('/discord', isLoggedIn, require('./discord.js'));
router.use('/srtv', isLoggedIn, require('./srtv.js'));
router.use('/twitch', isLoggedIn, require('./twitch.js'));
router.use('/settings', isLoggedIn, require('./settings.js'));

module.exports = router;