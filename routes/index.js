const express = require('express'),
  router = express.Router();

// Homepage
router.get('/', (req, res) => {res.render('index')});

// Routes
router.use('/tourney', require('./tourney.js'));
router.use('/discord', require('./discord.js'));
router.use('/srtv', require('./srtv.js'));
router.use('/twitch', require('./twitch.js'));
router.use('/settings', require('./settings.js'));

module.exports = router;