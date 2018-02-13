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
let botChannel = '#' + config.twitch.username.toLowerCase();

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
    // Check for basic static command first
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
            //client.say(to, '@' + from + ' => That command is on cooldown for another ' + onCooldown + ' seconds!');
          }
        })
        .catch(console.error);
    // Listen for specific commands in the bot's channel
    } else if (to === botChannel) {
      if (commandNoPrefix === 'join') {
        // join the requesting user's channel
        const userChannel = '#' + from;
        console.log(`Received request to join ${userChannel}`);
        let channelIndex = twitchChannels.indexOf(userChannel);
        if (channelIndex === -1) {
          client.say(to, `@${from} >> Joining your channel... please mod ${config.twitch.username} to avoid accidental timeouts or bans!`);
          //console.log('before join', twitchChannels);
          client.join(userChannel, () => {
            // somehow the line below is happening without the line below being called
            //twitchChannels.push(userChannel);
            //console.log('after join', twitchChannels);
            updateChannelList(joinChannelsFilePath, twitchChannels);
          });
        } else {
          client.say(to, '@' + from + ' >> I am already in your channel!');
        }
      } else if (commandNoPrefix === 'leave') {
        // leave the requesting user's channel
        const userChannel = '#' + from;
        console.log(`Received request to leave ${userChannel}`);
        let channelIndex = twitchChannels.indexOf(userChannel);
        if (channelIndex !== -1) {
          client.say(to, `@${from} >> Leaving your channel... use ${config.twitch.cmdPrefix}join in this channel to re-join at any time!`);
          //console.log('before part', twitchChannels);
          client.part(userChannel, 'Okay, bye! Have a beautiful time!', () => {
            //console.log('removing 1 element at position', channelIndex);
            twitchChannels.splice(channelIndex, 1);
            //console.log('after part', twitchChannels);
            updateChannelList(joinChannelsFilePath, twitchChannels);
          });
        } else {
          client.say(to, '@' + from + ' >> I am not in your channel!');
        }
      }
    }
  }
});

function updateChannelList(filePath, channels)
{
  //console.log('updating channel list...', channels);
  fs.writeFile(filePath+'.new', channels.join('\n'), (err) => {
    if (err) console.error(err);
  });
}

process.stdin.resume(); // so the program will not close instantly

function exitHandler(options, err) {
  if (options.cleanup) {
    console.log('script is exiting... starting cleanup...');
    // if we created a .new file for the channel list, copy that to the live file and delete the .new file
    let newFilePath = joinChannelsFilePath+'.new';
    if (fs.existsSync(newFilePath)) {
      console.log(`copying ${newFilePath} to ${joinChannelsFilePath}...`);
      fs.copyFileSync(newFilePath, joinChannelsFilePath);
      console.log(`removing ${newFilePath}...`);
      fs.unlinkSync(newFilePath);
    }
    console.log('cleanup finished');
  }

  // log any errors and exit
  if (err) console.log(err.stack);
  if (options.exit) process.exit();
}

// do some cleanup when this process stops
process.on('exit', exitHandler.bind(null, {cleanup:true}));

// catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, {exit:true}));

// catches "kill pid" (for example: nodemon restart)
process.on('SIGUSR1', exitHandler.bind(null, {exit:true}));
process.on('SIGUSR2', exitHandler.bind(null, {exit:true}));

// catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null, {exit:true}));

// catches Promise errors
process.on('unhandledRejection', console.error);
