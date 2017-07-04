/*
  ALttP Discord Bot
    General TODOs
      - Move this to a server
*/

// Settings
var botName = 'ACMLMv2.0',
  alertsChannelName = 'alttp-alerts',
  twitchGameName = 'The Legend of Zelda: A Link to the Past',
  twitchStatusFilters = /rando|lttpr|z3r|casual|2v2/i,
  srlGameName = 'The Legend of Zelda: A Link to the Past',
  srlIrcServer = 'irc.speedrunslive.com',
  srlUsername = 'alttpracewatcher',
  allowedRolesForRequest = /nmg\-race|100\-race|test\-role/,
  textCmdCooldown = 60,
  srcGameSlug = 'alttp';

// Import modules
var request = require('request'),
  trequest = require('then-request'),
  irc = require('irc'),
  fs = require('fs'),
  path = require('path'),
  Discord = require('discord.js');

// File paths for config/keys
var tokenFilePath = path.join(__dirname, 'discord_token'),
  textCommandsFilePath = path.join(__dirname, 'text_commands'),
  twitchClientIdPath = path.join(__dirname, 'twitch_client_id'),
  twitchStreamsPath = path.join(__dirname, 'twitch_streams'),
  livestreamsPath = path.join(__dirname, 'livestreams'),
  cooldownsPath = path.join(__dirname, 'cooldowns'),
  srcCategoriesPath = path.join(__dirname, 'src_categories');

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
var twitchChannels = fs.readFileSync(twitchStreamsPath, 'utf-8');
twitchChannels = twitchChannels.toString().split('\r\n');

// Read in current category info on SRC (run src.js to refresh)
var indexedCategories = {};
var srcCategories = fs.readFileSync(srcCategoriesPath, 'utf-8');
srcCategories = srcCategories.toString().split('|||||');
srcCategories.forEach(function(category, index) {
  if (category)
  {
    category = JSON.parse(category);
    if (/no/i.test(category.name)) {
      indexedCategories.nmg = category;
    } else {
      indexedCategories.mg = category;
    }
  }
});

// Set up Discord client
const client = new Discord.Client();

// The ready event is vital, it means that your bot will only start reacting to information
// from Discord _after_ ready is emitted
client.on('ready', () => {
  console.log(botName + ' Online');

  // Find the channel where we'll be posting alerts
  var alertsChannel = client.channels.find('name', alertsChannelName);
  //alertsChannel.send(botName + ' has connected. :white_check_mark:');

  // Watch for streams going live
  updateStreams();
  setInterval(updateStreams, 60000);

  // Watch for SRL races
  watchForSRLRaces(srlGameName);

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
      if (err || !data) data = {};
      var oldLiveStreams = JSON.parse(data);
      var newLiveStreams = {};

      streams.forEach(function(stream) {
        // Only send an alert message if this stream was not already live
        if (!oldLiveStreams.hasOwnProperty(stream._id)) {
          alertsChannel.send(':arrow_forward: **NOW LIVE** :: ' + stream.channel.url + ' :: *' + stream.channel.status + '*');
        } else {
          // Stream was already online, check for title change
          if (oldLiveStreams[stream._id] !== stream.channel.status) {
            alertsChannel.send(':arrows_counterclockwise: **NEW TITLE** :: ' + stream.channel.url + ' :: *' + stream.channel.status + '*');
          }
        }
        // @todo eventually just store the whole object so we can output whatever properties we want later
        newLiveStreams[stream._id] = stream.channel.status;
      });

      // Store the new list of live streams to a separate file so when the bot restarts it doesn't spam the channel
      fs.writeFile(livestreamsPath, JSON.stringify(newLiveStreams), function(err) {
        if (err) {
          return console.log(err);
        }
      });
    });
  }

  // Connect via IRC to SRL and watch for races
  function watchForSRLRaces(gameName)
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

  // Allow members to request role additions/removals for allowed roles
  if (message.content.startsWith('!addrole') || message.content.startsWith('!removerole'))
  {
    // parse+validate role name
    var roleName = message.content.match(/\!(add|remove)role\s([a-z0-9\-]+)/);
    if (!roleName)
    {
      message.member.createDM()
        .then(channel => {
          channel.send("You must include a role name! *e.g. !"+roleName[1]+"role nmg-race*");
        })
        .catch(console.log);
    }
    else
    {
      if (allowedRolesForRequest.test(roleName[2]))
      {
        // find the role in the member's guild
        var role = message.guild.roles.find('name', roleName[2]);

        if (!role) {
          return console.log(roleName[2] + ' does not exist on this server');
        }

        // add/remove the role and DM the user the results
        if (roleName[1] === 'add')
        {
          message.member.addRole(role)
            .then(requestingMember => {
              requestingMember.createDM()
                .then(channel => {
                  channel.send("You have successfully been added to the " + roleName[2] + " group!")
                })
                .catch(console.log)
            })
            .catch(console.log);
        }
        else if (roleName[1] === 'remove')
        {
          message.member.removeRole(role)
            .then(requestingMember => {
              requestingMember.createDM()
                .then(channel => {
                  channel.send("You have successfully been removed from the " + roleName[2] + " group!")
                })
                .catch(console.log)
            })
            .catch(console.log);
        }
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

  // SRC API Integration (leaderboard lookup)
  else if (message.content.startsWith('!wr'))
  {
    var parsed = message.content.match(/\!wr\s(nmg|mg)\s(.+)/);
    if (!parsed || parsed[1] === undefined || parsed[2] === undefined) {
      message.channel.send("Not a valid category.");
      return;
    }
    var mainCat = parsed[1].toLowerCase();
    var subCatName = parsed[2].toLowerCase();

    // look up ID for this category in local cache
    var subCategory = indexedCategories[mainCat].subcategories.find(function(subcategory) {
      return subcategory.name.toLowerCase().startsWith(subCatName);
    });

    if (!subCategory) {
      message.channel.send("Not valid sub-category name!");
      return;
    }

    var subCatVarName = 'var-'+subCategory.varId;
    var query = {
        top: 1,
        embed: 'players'
    };
    query[subCatVarName] = subCategory.id;

    trequest(
      'GET',
      'http://www.speedrun.com/api/v1/leaderboards/alttp/category/' + indexedCategories[mainCat].id,
      {
        qs: query,
        headers: {'User-Agent': 'alttp-bot/1.0'}
      }
    ).done(function(res) {
      var data = JSON.parse(res.getBody());
      if (data && data.data && data.data.runs)
      {
        var run = data.data.runs[0].run;
        var runner = data.data.players.data[0].names.international;
        var runtime = run.times.primary_t;
        var response = 'The current world record for *' + indexedCategories[mainCat].name + ' | ' + subCategory.name
                    + '* is held by **' + runner + '** with a time of ' + runtime.toString().toHHMMSS() + '.'
                    + ' ' + run.weblink;
        message.channel.send(response);
      }
    });
  }
  else if (message.content.startsWith('!rules'))
  {

  }
  else if (message.content.startsWith('!time'))
  {

  }

  // Search for matching text command if message starts with !
  else if (message.content.startsWith('!'))
  {
    if (textCommands.hasOwnProperty(message.content))
    {
      // Make sure this command isn't on cooldown
      var onCooldown = false;
      fs.readFile(cooldownsPath, function(err, data) {
        if (err || !data) data = {};

        var cooldowns = JSON.parse(data);
        if (cooldowns.hasOwnProperty(message.content))
        {
          // Command was recently used, check timestamp to see if it's on cooldown
          if ((message.createdTimestamp - cooldowns[message.content]) < (textCmdCooldown*1000)) {
            onCooldown = true;
          }
        }

        if (!onCooldown) {
          message.channel.send(textCommands[message.content]);
          cooldowns[message.content] = message.createdTimestamp;
        } else {
          // DM the user that it's on CD
          message.member.createDM()
            .then(channel => {
              channel.send(message.content + ' is currently on cooldown for another ' + ((textCmdCooldown*1000)- (message.createdTimestamp - cooldowns[message.content]))/1000 + ' seconds!');
            })
            .catch(console.log);
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

// Log our bot in
client.login(token);

String.prototype.toHHMMSS = function () {
  var sec_num = parseInt(this, 10); // don't forget the second param
  var hours   = Math.floor(sec_num / 3600);
  var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
  var seconds = sec_num - (hours * 3600) - (minutes * 60);

  if (hours   < 10) {hours   = "0"+hours;}
  if (minutes < 10) {minutes = "0"+minutes;}
  if (seconds < 10) {seconds = "0"+seconds;}
  return hours+':'+minutes+':'+seconds;
}