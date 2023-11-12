const express = require('express'),
  router = express.Router(),
  moment = require('moment-timezone'),
  irc = require('irc'),
  db = require('../db');

router.get('/', (req, res) => {
	res.redirect('/livestreams');
});

// Twitch Settings Control
router.get('/settings', (req, res) => {
	req.app.locals.config.twitch.channels.sort();
	res.render('twitch/settings', req.app.locals.config.twitch);
});

router.post('/settings', (req, res) => {
  // @TODO: validation
  let update = {
    "twitch.ircServer": req.body.ircServer,
    "twitch.username": req.body.username,
    "twitch.oauth": req.body.oauth,
    "twitch.textCmdCooldown": req.body.cooldown,
    "twitch.cmdPrefix": req.body.prefix,
    "twitch.blacklistedUsers": req.body.blacklistedUsers.trim().split(',').filter(e => e.length > 0),
    "twitch.admins": req.body.admins.trim().split(',').filter(e => e.length > 0)
  };

  db.get().collection('config').update({"default": true}, {"$set": update}, err => {
    if (err) {
      console.log(err);
      return res.status(500).send(err);
    }

    res.send({"updated": true});
  });
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

  client.addListener(`message#${config.twitch.username}`, (from, msg) => {
  	//console.log(from, to, msg);
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

  client.addListener(`message#${config.twitch.username}`, (from, msg) => {
  	//console.log(from, to, msg);
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

router.post('/restart', (req, res) => {
  console.log(`received request to restart the twitch bot`);

  let config = req.app.locals.config;

  // Connect to Twitch IRC server and join our own channel
  let client = new irc.Client(config.twitch.ircServer, config.twitch.username, {
    password: config.twitch.oauth,
    autoConnect: false,
    channels: ['#'+config.twitch.username]
  });

  client.connect(10, () => {
    client.say('#'+config.twitch.username, `${config.twitch.cmdPrefix}reboot`);
  });

  client.addListener('error', message => {
    if (message.command != 'err_unknowncommand') {
      console.error('error from Twitch IRC Server: ', message);
    }
  });

  client.addListener(`message#${config.twitch.username}`, (from, msg) => {
    //console.log(from, msg);
    if (from === config.twitch.username) {
      if (msg.includes(`Rebooting`)) {
        client.disconnect();
        res.send({status: 'rebooting'});
      } else {
        client.disconnect();
        res.send({status: 'error'});
      }
    }
  });
});

router.post('/livestreams/blacklist', (req, res) => {
  console.log(`received request to blacklist ${req.body.id}`);

  db.get().collection('config').updateOne({"default": true}, {"$addToSet": {"streamAlerts.blacklistedUsers": req.body.id.toLowerCase()}}, err => {
    if (err) {
      console.log(err);
      return res.status(500).send(err);
    }

    res.send({"updated": true});
  });
});

module.exports = router;