const express = require('express'),
  router = express.Router(),
  moment = require('moment-timezone'),
  db = require('../db');

router.get('/', (req, res) => {
	res.render('twitch/index');
});

module.exports = router;