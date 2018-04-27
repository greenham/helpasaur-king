const express = require('express'),
  router = express.Router(),
  passport = require('passport'),
  Account = require('../models/account');

// Homepage
router.get('/', (req, res) => {
	if (!req.user) {
		res.redirect('/login');
	} else {
		res.render('index', { user : req.user })
	}
});

// Login page
router.get('/login', (req, res) => {
	if (req.user) {
		res.redirect('/');
	}

	res.render('login', { user: req.user });
});

router.post('/login',
  passport.authenticate('local'),
  (req, res) => {
  	res.send({ user: req.user });
  }
);

router.get('/logout', (req, res) => {
	req.logout();
	res.redirect('/');
});

router.get('/ping', (req, res) => {
	res.status(200).send("pong!");
})

// Routes
router.use('/tourney', require('./tourney.js'));
router.use('/discord', require('./discord.js'));
router.use('/srtv', require('./srtv.js'));
router.use('/twitch', require('./twitch.js'));
router.use('/settings', require('./settings.js'));

module.exports = router;