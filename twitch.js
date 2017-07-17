/**
 * ALttP Twitch Bot
 */

// Import modules
const irc = require('irc'),
  memcache = require('memcache'),
  md5 = require('md5'),
  fs = require('fs'),
  path = require('path');

// Read in bot configuration
let config = require('./config.json');

// Config file paths
const textCommandsFilePath = path.join(__dirname, 'conf', 'text_commands'),
  joinChannelsFilePath = path.join(__dirname, 'conf', 'twitch_bot_channels');

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

// Read in basic text commands / definitions and watch for changes
let textCommands = readTextCommands(textCommandsFilePath);
fs.watchFile(textCommandsFilePath, (curr, prev) => {
  if (curr.mtime !== prev.mtime) {
    textCommands = readTextCommands(textCommandsFilePath);
  }
});

// Connect to cache
let cache = new memcache.Client();
cache.on('connect', () => {
}).on('error', function(e) {
  console.error(e);
});
cache.connect();

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
  // Basic text commands
  if (message.startsWith('!')) {
    if (textCommands.hasOwnProperty(message)) {
      console.log(to + ': ' + message);

      // Make sure this command isn't on cooldown
      let cooldownIndex = to+message;
      isOnCooldown(cooldownIndex, config.twitch.textCmdCooldown, function(onCooldown) {
        if (onCooldown === false) {
          client.say(to, textCommands[message]);
          placeOnCooldown(cooldownIndex, config.twitch.textCmdCooldown);
        } else {
          // command is on cooldown in this channel
          client.say(to, '@' + from + ' => That command is on cooldown for another ' + onCooldown + ' seconds!');
        }
      });
    }
  }
});

// Read/parse text commands from the "database"
function readTextCommands(filePath)
{
  var commands = {};
  var data = fs.readFileSync(filePath, 'utf-8');
  var commandLines = data.toString().split('\n');
  var commandParts;
  commandLines.forEach(function(line) {
    commandParts = line.split('|');
    commands[commandParts[0]] = commandParts[1];
  });
  return commands;
}

// Given a cooldownTime in seconds and a command, returns false if the command is not on cooldown
// returns the time in seconds until the command will be ready again otherwise
function isOnCooldown(command, cooldownTime, callback)
{
  var now = Date.now();
  var onCooldown = false;

  cache.get(md5(command), function(err, timeUsed) {
    if (err) console.log(err);

    if (!err && timeUsed !== null) {
      // Command was recently used, check timestamp to see if it's on cooldown
      if ((now - timeUsed) <= (cooldownTime*1000)) {
        // Calculate how much longer it's on cooldown
        onCooldown = ((cooldownTime*1000) - (now - timeUsed))/1000;
      }
    }

    if (callback !== undefined) callback(onCooldown);
    return onCooldown;
  });
}

// Places a command on cooldown for cooldownTime (in seconds)
function placeOnCooldown(command, cooldownTime)
{
  cache.set(md5(command), Date.now(), function(err, res) {}, cooldownTime);
}