var irc = require('irc'),
  fs = require('fs'),
  path = require('path');

var twitchIrcServer = 'irc.chat.twitch.tv';
var twitchUsername = 'alttpbot';
var botName = 'ACMLMv2.0'
var twitchOauth = fs.readFileSync(path.join(__dirname, 'etc', 'twitch_oauth'), 'utf-8');
var textCmdCooldown = 60;
var cooldownsPath = path.join(__dirname, 'etc', 'twitch_cooldowns');

// Read in basic text commands / definitions to an array
var textCommands = {};
fs.readFile(path.join(__dirname, 'etc', 'text_commands'), function (err, data) {
  if (err) throw err;
  var commandLines = data.toString().split('\n');
  var commandParts;
  commandLines.forEach(function(line) {
    commandParts = line.split('|');
    textCommands[commandParts[0]] = commandParts[1];
  });
});

// Connect to Twitch IRC server
var client = new irc.Client(twitchIrcServer, twitchUsername, {
  password: twitchOauth,
  autoRejoin: true,
  retryCount: 10,
  channels: ['#greenham83', '#screevo', '#timmon_']
});

client.addListener('error', function(message) {
  console.log('error: ', message);
});

client.addListener('message', function (from, to, message) {
  // Basic text commands
  if (message.startsWith('!'))
  {
    if (textCommands.hasOwnProperty(message))
    {
      console.log(to + ': ' + message);

      // Make sure this command isn't on cooldown
      var cooldownIndex = to+message;
      var onCooldown = false;

      fs.readFile(cooldownsPath, function(err, data) {
        if (err || !data) data = {};

        var cooldowns = JSON.parse(data);
        if (cooldowns.hasOwnProperty(cooldownIndex))
        {
          // Command was recently used, check timestamp to see if it's on cooldown
          if ((Date.now() - cooldowns[cooldownIndex]) < (textCmdCooldown*1000)) {
            onCooldown = true;
          }
        }

        if (!onCooldown) {
          client.say(to, textCommands[message]);
          cooldowns[cooldownIndex] = Date.now();
        } else {
          // command is on cooldown in this channel
          //client.say(to, 'That command is on cooldown for another ' + ((textCmdCooldown*1000)- (Date.now() - cooldowns[cooldownIndex]))/1000 + ' seconds!');
        }

        // write cooldowns back to file
        fs.writeFile(cooldownsPath, JSON.stringify(cooldowns), function(err) {
          if (err) {
            return console.log(err);
          }
        });
      });
    }
  }
});
