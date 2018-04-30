/**
 * ALttP Twitch Bot
 */

// Import modules
const irc = require('irc'),
  staticCommands = require('./lib/commands.js'),
  cooldowns = require('./lib/cooldowns.js'),
  db = require('./db.js');

// Read internal configuration
let config = require('./config.json');

config.twitch.blacklistedUsers = [
  "chaos_lord2"
];

// Connect to DB
db.connect(config.db.host, config.db.db, (err) => {
  if (!err) {
    // Read external configuration from DB
    db.get().collection("config").findOne({"default": true}, (err, userConfig) => {
      if (!err) {
        config = Object.assign(config, userConfig);
        init(config);
      } else {
        console.error(`Unable to read config from database: ${err}`);
        process.exit(1);
      }
    });
  } else {
    console.error('Unable to connect to Mongo! Check config.json');
    process.exit(1);
  }
});

const init = (config) => {
  let botChannel = '#' + config.twitch.username.toLowerCase();

  // Connect to Twitch IRC server
  let client = new irc.Client(config.twitch.ircServer, config.twitch.username, {
    password: config.twitch.oauth,
    autoRejoin: true,
    retryCount: 10,
    channels: config.twitch.channels,
    debug: config.debug
  });

  client.addListener('error', message => {
    if (message.command != 'err_unknowncommand') {
      console.error('error from Twitch IRC Server: ', message);
    }
  });

  client.addListener('message', (from, to, message) => {
    // Ignore everything from blacklisted users
    if (config.twitch.blacklistedUsers.includes(from)) return;

    // Listen for commands that start with the designated prefix
    if (message.startsWith(config.twitch.cmdPrefix)) {
      let commandNoPrefix = message.slice(config.twitch.cmdPrefix.length).split(' ')[0];
      // Check for basic static command first
      if (result = staticCommands.get(commandNoPrefix)) {
        console.log(`received command in ${to} from ${from}: ${message}`);

        // Make sure this command isn't on cooldown
        let cooldownIndex = to+message;
        cooldowns.get(cooldownIndex, config.twitch.textCmdCooldown)
          .then(onCooldown => {
            if (onCooldown === false) {
              client.say(to, result.response);
              cooldowns.set(cooldownIndex, config.twitch.textCmdCooldown);
            } else {
              // command is on cooldown in this channel
            }
          })
          .catch(console.error);
      // Listen for specific commands in the bot's channel
      } else if (to === botChannel) {
        if (commandNoPrefix === 'join') {
          // join the requesting user's channel
          const userChannel = '#' + from;
          console.log(`Received request to join ${userChannel}`);
          let channelIndex = config.twitch.channels.indexOf(userChannel);
          if (channelIndex === -1) {
            client.say(to, `@${from} >> Joining your channel... please mod ${config.twitch.username} to avoid accidental timeouts or bans!`);

            // update config so this channel gets joined upon restart
            db.get().collection("config").update({"default": true}, {"$push": {"twitch.channels": userChannel}}, (err, res) => {
              if (err) {
                console.error(`Error adding twitch channel to bot list: ${err}`);
              } else {
                console.log(`Added ${userChannel} to twitch bot channel list`);
              }
            });

            client.join(userChannel);
          } else {
            client.say(to, '@' + from + ' >> I am already in your channel!');
          }
        } else if (commandNoPrefix === 'leave') {
          // leave the requesting user's channel
          const userChannel = '#' + from;
          console.log(`Received request to leave ${userChannel}`);
          let channelIndex = config.twitch.channels.indexOf(userChannel);
          if (channelIndex !== -1) {
            client.say(to, `@${from} >> Leaving your channel... use ${config.twitch.cmdPrefix}join in this channel to re-join at any time!`);

            // update config so this channel no longer gets joined upon restart
            db.get().collection("config").update({"default": true}, {"$pull": {"twitch.channels": userChannel}}, (err, res) => {
              if (err) {
                console.error(`Error removing twitch channel from bot list: ${err}`);
              } else {
                console.log(`Removed ${userChannel} from twitch bot channel list`);
              }
            });

            client.part(userChannel, 'Okay, bye! Have a beautiful time!');
          } else {
            client.say(to, '@' + from + ' >> I am not in your channel!');
          }
        } else if (commandNoPrefix === 'status') {
          const userChannel = '#' + from;
          let channelIndex = config.twitch.channels.indexOf(userChannel);
          if (channelIndex !== -1) {
            client.say(to, '@' + from + ' >> I am in your channel!');
          } else {
            client.say(to, '@' + from + ' >> I am not in your channel!');
          }
        } else if (commandNoPrefix === 'reboot') {
          if (from === 'greenham') {
            console.log('Received request from admin to reboot...');
            client.say(to, 'Rebooting...');
            process.exit(0);
          }
        }
      }
    }
  });

  client.addListener('registered', message => {
    console.log(`Connected to ${message.server}`);
  });

  client.addListener('join', (channel, nick, message) => {
    if (nick === config.twitch.username) {
      console.log(`Joined channel ${channel}`);
    }
  });

  client.addListener('part', (channel, nick, message) => {
    if (nick === config.twitch.username) {
      console.log(`Left channel ${channel}`);
    }
  });

  client.addListener('motd', motd => {
    console.log(`Received MOTD: ${motd}`);
  });
}

// catches Promise errors
process.on('unhandledRejection', console.error);
