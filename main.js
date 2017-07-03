/*
  ALttP Discord Bot
    General TODOs
      - Add basic cooldowns for all commands
      - Move this to a server
      - Add !commands listing -- DM to requesting user
*/

// Settings
var botName = 'ACMLM v2.0',
  alertsChannelName = 'alttp-alerts',
  twitchGameName = 'The Legend of Zelda: A Link to the Past',
  twitchStatusFilters = /rando|lttpr|z3r|casual|2v2/i,
  srlGameName = 'The Legend of Zelda: A Link to the Past',
  srlIrcServer = 'irc.speedrunslive.com',
  srlUsername = 'alttpracewatcher';

// Import modules
var request = require('request'),
  irc = require('irc'),
  fs = require('fs'),
  path = require('path'),
  Discord = require('discord.js');

// File paths for config/keys
var tokenFilePath = path.join(__dirname, 'discord_token'),
  textCommandsFilePath = path.join(__dirname, 'text_commands'),
  twitchClientIdPath = path.join(__dirname, 'twitch_client_id'),
  twitchStreamsPath = path.join(__dirname, 'twitch_streams'),
  livestreamsPath = path.join(__dirname, 'livestreams');

// The token of your bot - https://discordapp.com/developers/applications/me
// Should be placed in discord_token file for security purposes
// Read token synchronously so we don't try to connect without it
var token = fs.readFileSync(tokenFilePath, 'utf-8');

// Read in basic text commands / definitions to an array
var textCommands = {};
fs.readFile(textCommandsFilePath, function (err, data) {
  if (err) throw err;
  var commandLines = data.toString().split('\n');
  var commandParts;
  commandLines.forEach(function(line) {
    commandParts = line.split('|');
    textCommands[commandParts[0]] = commandParts[1];
  });
});

// Read in Twitch client ID for use with API
var twitchClientId = fs.readFileSync(twitchClientIdPath, 'utf-8');

// Read in list of Twitch streams
var twitchChannels;
fs.readFile(twitchStreamsPath, function (err, data) {
  twitchChannels = data.toString().split('\r\n');
});

// Set up Discord client
const client = new Discord.Client();

// The ready event is vital, it means that your bot will only start reacting to information
// from Discord _after_ ready is emitted
client.on('ready', () => {
  console.log(botName + ' Online');

  // Let the world know we're here
  var alertsChannel = client.channels.find('name', alertsChannelName);
  alertsChannel.send(botName + ' has connected. :white_check_mark:');

  // Watch for streams going live
  updateStreams();
  setInterval(updateStreams, 60000);

  // Watch for SRL races
  listenForSRLRaces(srlGameName);

  function updateStreams()
  {
    findLiveStreams(handleStreamResults);
  }

  // Connect to Twitch to pull a list of currently live streams for ALttP
  // Attempt to automatically filter out non-speedrun streams
  function findLiveStreams(cb)
  {
    var searchReq = {
      url: 'https://api.twitch.tv/kraken/streams?limit=100&game='+encodeURIComponent(twitchGameName)+'&channel='+encodeURIComponent(twitchChannels.join()),
      headers: {
        'Client-ID': twitchClientId
      }
    };
    var searchHandler = function (error, response, body) {
      if (!error && response.statusCode == 200)
      {
        var info = JSON.parse(body);
        if (info._total > 0)
        {
          //console.log("Found " + info._total + " live streams -- filtering...");
          var filteredStreams = info.streams.filter(function (item) {
            return !(twitchStatusFilters.test(item.channel.status));
          });
          //console.log("Found " + filteredStreams.length + " live streams after filtering.");
          cb(filteredStreams);
        }
      } else {
        console.log('Error finding live twitch streams: ', error); // Print the error if one occurred
        console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
        cb(false);
      }
    }
    //console.log("Searching Twitch for live streams of " + twitchGameName);
    request(searchReq, searchHandler);
  }

  function handleStreamResults(streams)
  {
    if (streams === false) {
      return console.log("No livestreams found.");
    }

    // Read the list of currently live streams we've already alerted about
    fs.readFile(livestreamsPath, function(err, data) {
      var liveStreamIds = data.toString().split(',')
      var newLiveStreamIds = [];

      streams.forEach(function(stream) {
        // Only send an alert message if this stream was not already live
        // @todo Check for title differences and either send new msg or edit previous?
        if (liveStreamIds.indexOf(stream._id.toString()) === -1) {
          alertsChannel.send('**NOW LIVE** :: ' + stream.channel.url + ' :: *' + stream.channel.status + '*');
        }
        newLiveStreamIds.push(stream._id);
      });

      liveStreamIds = newLiveStreamIds;

      // Store the new list of live streams to a separate file so when the bot restarts it doesn't spam the channel
      fs.writeFile(livestreamsPath, liveStreamIds.join(), function(err) {
        if (err) {
          return console.log(err);
        }
      });
    });
  }

  // Connect via IRC to SRL and listen for races
  function listenForSRLRaces(gameName)
  {
    var client = new irc.Client(srlIrcServer, srlUsername, {
      channels: ['#speedrunslive'],
    });
    client.addListener('message#speedrunslive', function (from, message) {
      if (from === 'RaceBot')
      {
        var raceChannel = message.match(/srl\-([a-z0-9]{5})/),
          srlUrl;
        if (raceChannel) {
          srlUrl = 'http://www.speedrunslive.com/race/?id='+raceChannel[1];
        }
        var goal = message.match(/\-\s(.+)\s\|/);

        if (message.startsWith('Race initiated for ' + gameName + '. Join')) {
          alertsChannel.send('**SRL Race Started** :: *#' + raceChannel[0] + '* :: A race was just started for ' + gameName + '! | ' + srlUrl);
        } else if (message.startsWith('Goal Set: ' + gameName + ' - ')) {
          alertsChannel.send('**SRL Race Goal Set** :: *#' + raceChannel[0] + '* ::  __' + goal[1] + '__ | ' + srlUrl);
        } else if (message.startsWith('Race finished: ' + gameName + ' - ')) {
          alertsChannel.send('**SRL Race Finished** :: *#' + raceChannel[0] + '* :: __' + goal[1] + '__ | ' + srlUrl);
        } else if (message.startsWith('Rematch initiated: ' + gameName + ' - ')) {
          alertsChannel.send('**SRL Rematch** :: *#' + raceChannel[0] + '* :: __' + goal[1] + '__ | ' + srlUrl);
        }
      }
    });
  }
});

// Create an event listener for messages
client.on('message', message => {


  // Allow members to request role additions/removals for @nmg-race and @100-race on the alttp discord
  if (message.content.startsWith('!addrole'))
  {
    // parse+validate role name
    var roleName = message.content.match(/\!addrole\s([a-z0-9\-]+)/);
    if (!roleName)
    {
      message.member.createDM()
        .then(channel => {
          channel.send("You must include a role name! *e.g. !addrole nmg-race*");
        })
        .catch(console.log);

    }
    else
    {
      if (/nmg\-race|100\-race|test\-role/.test(roleName[1]))
      {
        // find the role in the member's guild
        var role = message.guild.roles.find('name', roleName[1]);

        // add the role and DM the user the results
        message.member.addRole(role)
          .then(requestingMember => {
            requestingMember.createDM()
              .then(channel => {
                channel.send("You have successfully been added to the " + roleName[1] + " group!")
              })
              .catch(console.log)
          })
          .catch(console.log);
      }
      else
      {
        message.member.createDM()
          .then(channel => {
            channel.send(roleName[1] + " is not a valid role name!")
          })
          .catch(console.log);
      }
    }
  }

  // Search for text commands in array if message starts with !
  if (message.content.startsWith('!'))
  {
    if (textCommands.hasOwnProperty(message.content))
    {
      message.channel.send(textCommands[message.content]);
    }
  }
});

// Log our bot in
client.login(token);
