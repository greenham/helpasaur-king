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

	let command = `${config.twitch.cmdPrefix}join ${req.body.channel}`;

  client.connect(10, () => {
  	client.say('#'+config.twitch.username, command);
  });

  client.addListener('error', message => {
    if (message.command != 'err_unknowncommand') {
      console.error('error from Twitch IRC Server: ', message);
    }
  });

  client.addListener(`message#${config.twitch.username}`, (from, to, msg) => {
  	console.log(from, to, msg);
  	if (from === config.twitch.username) {
  		if (msg.includes(`Joining #${req.body.channel}`)) {
	  		client.disconnect();
	  		res.send({status: 'joined'});
  		} else if (msg.includes(`already in your channel`)) {
  			client.disconnect();
  			res.send({status: 'exists'});
  		}
  	}
  });

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
  	client.say('#'+config.twitch.username, `${config.twitch.cmdPrefix}leave ${req.body.channel.substr(1)}`);
  });

  client.addListener('error', message => {
    if (message.command != 'err_unknowncommand') {
      console.error('error from Twitch IRC Server: ', message);
    }
  });

  client.addListener(`message#${config.twitch.username}`, (from, to, msg) => {
  	console.log(from, to, msg);
  	if (from === config.twitch.username) {
  		if (msg.includes(`Leaving ${req.body.channel}`)) {
	  		client.disconnect();
				res.send({status: 'left'});
			} else if (msg.includes(`not in your channel`)) {
				client.disconnect();
				res.send({status: 'missing'});
			}
  	}
  });

});

module.exports = router;