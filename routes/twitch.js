const express = require('express'),
  router = express.Router(),
  moment = require('moment-timezone'),
  irc = require('irc'),
  db = require('../db');

router.get('/', (req, res) => {
	res.render('twitch/index');
});

// Twitch Settings Control
router.get('/settings', (req, res) => {
	req.app.locals.config.twitch.channels.sort();
	res.render('twitch/settings', req.app.locals.config.twitch);
});

router.post('/channels', (req, res) => {
	console.log(`received request to join ${req.body.channel}`);

	let config = req.app.locals.config;

	// Connect to Twitch IRC server and join our own channel
  let client = new irc.Client(config.twitch.ircServer, config.twitch.username, {
    password: config.twitch.oauth,
    autoConnect: false,
    channels: ['#'+config.twitch.username]
  });

  client.connect(10, () => {
  	let message = `${config.twitch.cmdPrefix}join ${req.body.channel}`;
  	client.say('#'+config.twitch.username, message);
  });

  client.addListener('error', message => {
    if (message.command != 'err_unknowncommand') {
      console.error('error from Twitch IRC Server: ', message);
    }
  });

  client.addListener('message', (from, to, msg) => {
  	console.log(from, to, msg);
  	if (from === config.twitch.username && to === '#'+config.twitch.username && msg.includes(`Joining ${req.body.channel}`)) {
  		client.disconnect();
  	}
  });

  res.send({result: true});
});

router.delete('/channels', (req, res) => {
	// have the bot leave requested channel
	console.log(`received request to leave ${req.body.channel}`);

	let config = req.app.locals.config;

	// Connect to Twitch IRC server and join our own channel
  let client = new irc.Client(config.twitch.ircServer, config.twitch.username, {
    password: config.twitch.oauth,
    autoConnect: false,
    channels: ['#'+config.twitch.username]
  });

  client.connect(10, () => {
  	let message = `${config.twitch.cmdPrefix}leave ${req.body.channel.substr(1)}`;
  	client.say('#'+config.twitch.username, message);
  });

  client.addListener('error', message => {
    if (message.command != 'err_unknowncommand') {
      console.error('error from Twitch IRC Server: ', message);
    }
  });

  client.addListener('message', (from, to, msg) => {
  	console.log(from, to, msg);
  	if (from === config.twitch.username && to === '#'+config.twitch.username && msg.includes(`Leaving ${req.body.channel}`)) {
  		client.disconnect();
  	}
  });

	res.send({result: true});
});

module.exports = router;