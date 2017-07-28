/**
 * ALttP Twitch Bot
 */

// Import modules
const irc = require('irc'),
  fs = require('fs'),
  path = require('path'),
  staticCommands = require('./lib/static-commands.js'),
  cooldowns = require('./lib/cooldowns.js');

// Read in bot configuration
let config = require('./config.json');

// Config file paths
const joinChannelsFilePath = path.join(__dirname, 'conf', 'twitch_bot_channels');

// Read in twitch channel list and watch for changes
let twitchChannels = fs.readFileSync(joinChannelsFilePath, 'utf-8').toString().split('\n');
fs.watchFile(joinChannelsFilePath, (curr, prev) => {
  if (curr.mtime !== prev.mtime) {
    // @todo figure out how to handle this scenario
    // option 1: compare old/new list and manually join/part those channels
    // let newTwitchChannels = fs.readFileSync(joinChannelsFilePath, 'utf-8').toString().split('\n');
    // option 2: disconnect, kill the process, and let forever reboot it
    client.disconnect(() => process.exit());
    // option 3: extract connection/listeners to function and call
  }
});

// Connect to Twitch IRC server
let client = new irc.Client(config.twitch.ircServer, config.twitch.username, {
  password: config.twitch.oauth,
  autoRejoin: true,
  retryCount: 10,
  channels: twitchChannels
});

client.addListener('error', function(message) {
  console.error('error from Twitch IRC Server: ', message);
});

client.addListener('message', function (from, to, message) {
  // Listen for commands that start with the designated prefix
  if (message.startsWith(config.twitch.cmdPrefix)) {
    let commandNoPrefix = message.slice(config.twitch.cmdPrefix.length).split(' ')[0];
    if (staticCommands.exists(commandNoPrefix)) {
      console.log(`received command in ${to} from ${from}: ${message}`);

      // Make sure this command isn't on cooldown
      let cooldownIndex = to+message;
      cooldowns.get(cooldownIndex, config.twitch.textCmdCooldown)
        .then(onCooldown => {
          if (onCooldown === false) {
            client.say(to, staticCommands.get(commandNoPrefix));
            cooldowns.set(cooldownIndex, config.twitch.textCmdCooldown);
          } else {
            // command is on cooldown in this channel
            client.say(to, '@' + from + ' => That command is on cooldown for another ' + onCooldown + ' seconds!');
          }
        })
        .catch(console.error);
    }
  }
});

// catch Promise errors
process.on('unhandledRejection', console.error);
