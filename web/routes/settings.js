const express = require('express'),
  router = express.Router(),
  permit = require('../lib/permission').permit;

router.get('/', permit('admin'), (req, res) => {
	res.render('settings/index');
});

router.use('/commands', permit('command-editor'), require('./settings/commands.js'));

module.exports = router;