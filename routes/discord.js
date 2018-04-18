const express = require('express'),
  router = express.Router(),
  DISCORD = require('discord.js'),
  moment = require('moment-timezone'),
  db = require('../db');

let guildId = "395628442017857536";	// NMG Tourney Discord
let guildPingChannel = "bot-testing";

router.get('/', (req, res) => {
	res.render('discord/index');
});

module.exports = router;