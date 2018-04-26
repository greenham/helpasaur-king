const express = require('express'),
  router = express.Router(),
  moment = require('moment-timezone'),
  db = require('../db');

router.get('/', (req, res) => {
	res.render('twitch/index');
});

// Twitch Settings Control
router.get('/settings', (req, res) => {
	res.send(req.app.locals.config.twitch);
});

module.exports = router;