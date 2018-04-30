const express = require('express'),
  router = express.Router();

router.get('/', (req, res) => {
	res.render('settings/index');
});

router.use('/commands', require('./settings/commands.js'));

module.exports = router;