const express = require('express'),
  router = express.Router(),
  staticCommands = require('../lib/static-commands.js'),
  moment = require('moment-timezone'),
  db = require('../db');

router.get('/', (req, res) => {
	// read in some conf files
	res.render('settings/index', {
		commandList: JSON.stringify(staticCommands.getAll())
	});
});

module.exports = router;