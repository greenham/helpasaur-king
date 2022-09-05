const express = require('express'),
  router = express.Router(),
  SRTV = require('../lib/srtv.js'),
  moment = require('moment-timezone'),
  db = require('../db');

router.get('/', (req, res) => {
	res.render('srtv/index');
});

module.exports = router;