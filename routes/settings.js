const express = require('express'),
  router = express.Router(),
  staticCommands = require('../lib/commands.js'),
  moment = require('moment-timezone'),
  db = require('../db');

router.get('/', (req, res) => {
	res.render('settings/index');
});

router.get('/commands', (req, res) => {
	res.render('settings/commands', {commands: staticCommands.getAll()});
});

module.exports = router;