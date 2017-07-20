/**
 * ALttP Discord Bot
 *   General TODOs
 *     - Extract basic functionality to a separate module that both discord/twitch can utilize
 *     - Allow users with alttp-bot-editor role to add/edit commands
<<<<<<< Updated upstream
 *     - Create per-environment settings file
 *     - Watch conf files for changes and auto-update
=======
 *     - Make the prefix (!) configurable
>>>>>>> Stashed changes
 */

// Settings
var botName = 'Helpasaur King',
  alertsChannelName = 'alttp-alerts',
  alertOnConnect = false,
  twitchGameName = 'The Legend of Zelda: A Link to the Past',
  twitchStatusFilters = /rando|lttpr|z3r|casual|2v2/i,
  twitchUpdateIntervalSeconds = 60,
  twitchOfflineToleranceSeconds = 600,
  srlGameName = 'The Legend of Zelda: A Link to the Past',
  srlIrcServer = 'irc.speedrunslive.com',
  srlUsername = 'HelpasaurKing',
  allowedRolesForRequest = /nmg\-race|100\-race/,
  textCmdCooldown = 10,
  srcCmdCooldown = 10,
  srcGameSlug = 'alttp',
  srcUserAgent = 'alttp-bot/1.0';

// Import modules
var request = require('request'),
  irc = require('irc'),
  fs = require('fs'),
  path = require('path'),
  memcache = require('memcache'),
  md5 = require('md5'),
  Discord = require('discord.js');

// File paths for config/keys
var etcPath = path.join(__dirname, 'etc');
var confPath = path.join(__dirname, 'conf');
var tokenFilePath = path.join(etcPath, 'discord_token'),
  twitchClientIdFilePath = path.join(etcPath, 'twitch_client_id'),
  twitchStreamsFilePath = path.join(confPath, 'twitch_streams'),
  textCommandsFilePath = path.join(confPath, 'text_commands'),
  srcCategoriesFilePath = path.join(confPath, 'src_categories');

// Discord token for bot - https://discordapp.com/developers/applications/me
var token = fs.readFileSync(tokenFilePath, 'utf-8').toString().trim().replace(/\n/, '');

// Read in Twitch client ID for use with API
var twitchClientId = fs.readFileSync(twitchClientIdFilePath, 'utf-8').toString().trim().replace(/\n/, '');

// Read in list of Twitch streams
var twitchChannels = fs.readFileSync(twitchStreamsFilePath, 'utf-8').toString().split('\n');

// Read in basic text commands / definitions
var textCommands = readTextCommands(textCommandsFilePath);

// Read in current category info on SRC (run src.js to refresh)
var indexedCategories = readSrcCategories(srcCategoriesFilePath);

// Set up Discord client
const client = new Discord.Client();
var alertsChannel;

// Connect to cache
var cache = new memcache.Client();
cache.on('connect', () => {
  // The ready event is vital, it means that your bot will only start reacting to information
  // from Discord _after_ ready is emitted
  client.on('ready', () => {
    console.log(botName + ' Online');

    // Find the text channel where we'll be posting alerts
    alertsChannel = client.channels.find('name', alertsChannelName);
    if (alertOnConnect === true) alertsChannel.send(botName + ' has connected. :white_check_mark:');

    // Watch allthethings
    watchForTwitchStreams();
    //watchForSrlRaces();
  });

  // Listen for commands (!)
  client.on('message', message => {

    // Allow members to request role additions/removals for allowed roles
    if (message.content.startsWith(`{config.prefix}addrole`) || message.content.startsWith(`{config.prefix}removerole`))
    {
      // parse+validate role name
      var roleName = message.content.match(/\!(add|remove)role\s([a-z0-9\-]+)/);
      if (!roleName) {
        dmUser(message, "You must include a role name! *e.g. !"+roleName[1]+"role nmg-race*");
      } else {
        if (allowedRolesForRequest.test(roleName[2])) {
          // make sure this message is in a guild channel they're a member of
          if (!message.guild) return;

          // find the role in the member's guild
          var role = message.guild.roles.find('name', roleName[2]);

          if (!role) {
            return console.log(roleName[2] + ' does not exist on this server');
          }

          // add/remove the role and DM the user the results
          if (roleName[1] === 'add') {
            message.member.addRole(role)
              .then(requestingMember => {
                requestingMember.createDM()
                  .then(channel => {
                    channel.send("You have successfully been added to the " + roleName[2] + " group!")
                  })
                  .catch(console.log)
              })
              .catch(console.log);
          } else if (roleName[1] === 'remove') {
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
        } else {
          dmUser(message, roleName[1] + " is not a valid role name!");
        }
      }
    }
    ///////////////////////////////////////////////////////////////////////////

    // Speedrun.com API Integration (leaderboard lookups)
    else if (message.content.startsWith(`{config.prefix}wr`))
    {
      message.content = message.content.toLowerCase();
      if (message.content === '!wr') {
        return dmUser(message, 'Useage: !wr {nmg/mg} {subcategory-code}');
      }

      parseSrcCategory(message.content, function(err, res) {
        if (err) {
          return dmUser(message, err);
        }

        // look up info for this sub-category in local cache
        // @todo move to its own function, multiple cases use this
        var category = indexedCategories[res.main];
        var subcategory = category.subcategories.find(function(s) {
          return s.code === res.sub;
        });

        if (!subcategory) {
          return dmUser(message, "Not a valid sub-category name! Codes are listed here: https://github.com/greenham/alttp-bot/blob/master/README.md#category-codes");
        }

        // Make sure this command isn't on cooldown in this channel
        var cooldownKey = message.content + message.channel.id;
        isOnCooldown(cooldownKey, srcCmdCooldown, function(onCooldown) {
          if (onCooldown === false) {
            var wrSearchReq = {
              url: 'http://www.speedrun.com/api/v1/leaderboards/alttp/category/' + category.id + '?top=1&embed=players&var-'+subcategory.varId+'='+subcategory.id,
              headers: {'User-Agent': srcUserAgent}
            };

            // check for cache of this request
            var wrCacheKey = md5(JSON.stringify(wrSearchReq));
            cache.get(wrCacheKey, function(err, res) {
              if (err || !res) {
                console.log(err);
              }

              if (!err && res !== null) {
                // cache hit
                message.channel.send(res);
              } else {
                request(wrSearchReq, function(error, response, body) {
                  if (!error && response.statusCode == 200) {
                    var data = JSON.parse(body);
                    if (data && data.data && data.data.runs) {
                      var run = data.data.runs[0].run;
                      var runner = data.data.players.data[0].names.international;
                      var runtime = run.times.primary_t;
                      var wrResponse = 'The current world record for *' + category.name + ' | ' + subcategory.name
                                  + '* is held by **' + runner + '** with a time of ' + runtime.toString().toHHMMSS() + '.'
                                  + ' ' + run.weblink;

                      message.channel.send(wrResponse)
                        .then(sentMessage => placeOnCooldown(cooldownKey, srcCmdCooldown))
                        .catch(console.error);

                      // cache the response
                      cache.set(wrCacheKey, wrResponse, handleCacheSet, 3600);
                    } else {
                      console.log('Unexpected response received from SRC: ' + data);
                    }
                  } else {
                    console.log('Error while calling SRC API: ', error); // Print the error if one occurred
                    console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
                  }
                });
              }
            });
          } else {
            // DM the user that it's on CD
            return dmUser(message, '"'+message.content + '" is currently on cooldown for another ' + onCooldown + ' seconds!');
          }
        });
      });
    }
    else if (message.content.startsWith(`{config.prefix}pb`))
    {
      message.content = message.content.toLowerCase();
      if (message.content === '!pb') {
        return dmUser(message, 'Useage: !pb {username} {nmg/mg} {subcategory-code}');
      }

      var commandParts = message.content.split(' ');
      if (!commandParts || commandParts[1] === undefined || commandParts[2] === undefined || commandParts[3] === undefined || (commandParts[2] != 'nmg' && commandParts[2] != 'mg')) {
        return dmUser(message, 'Useage: !pb {username} {nmg/mg} {subcategory-code}');
      }

      // look up info for this sub-category in local cache
      var category = indexedCategories[commandParts[2]];
      var subcategory = category.subcategories.find(function(s) {
        return s.code === commandParts[3];
      });

      if (!subcategory) {
        dmUser(message, 'Not a valid sub-category name! Codes are listed here: https://github.com/greenham/alttp-bot/blob/master/README.md#category-codes');
      }

      // Make sure this command isn't on cooldown
      var cooldownKey = message.content + message.channel.id;
      isOnCooldown(cooldownKey, srcCmdCooldown, function(onCooldown) {
        if (onCooldown === false) {
          // look up user on SRC, pull in PB's
          var userSearchReq = {
            url: 'http://www.speedrun.com/api/v1/users/'+encodeURIComponent(commandParts[1])+'/personal-bests?embed=players',
            headers: {'User-Agent': srcUserAgent}
          };

          // check for cache of this request
          var cacheKey = md5(JSON.stringify(userSearchReq));
          cache.get(cacheKey, function(err, res) {
            if (err || !res) {
              console.log(err);
            }

            if (!err && res !== null) {
              // cache hit
              response = findSrcRun(JSON.parse(res), category, subcategory);
              if (response) {
                message.channel.send(response);
              }
            } else {
              request(userSearchReq, function(error, response, body) {
                if (!error && response.statusCode == 200) {
                  var data = JSON.parse(body);

                  // add response to cache
                  cache.set(cacheKey, JSON.stringify(data), handleCacheSet, 3600);

                  response = findSrcRun(data, category, subcategory);
                  if (response) {
                    message.channel.send(response);
                  }
                } else {
                  console.log('Error while calling SRC API: ', error); // Print the error if one occurred
                  console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
                  return message.channel.send('No user found matching *' + commandParts[1] + '*.');
                }
              });
            }

            placeOnCooldown(cooldownKey, srcCmdCooldown);
          });
        } else {
          // DM the user that it's on CD
          return dmUser(message, '"'+message.content + '" is currently on cooldown for another ' + onCooldown + ' seconds!');
        }
      });
    }
    // @todo implement this
    else if (message.content.startsWith(`{config.prefix}rules`))
    {

    }
    ///////////////////////////////////////////////////////////////////////////

    // Static text commands
    else if (message.content.startsWith(config.prefix))
    {
      if (textCommands.hasOwnProperty(message.content))
      {
        // Make sure this command isn't on cooldown
        var cooldownKey = message.content + message.channel.id;
        isOnCooldown(cooldownKey, textCmdCooldown, function(onCooldown) {
          if (onCooldown === false) {
            message.channel.send(textCommands[message.content])
              .then(sentMessage => placeOnCooldown(cooldownKey, textCmdCooldown))
              .catch(console.error);
          } else {
            // DM the user that it's on CD
            // check that this isn't already a DM
            var cooldownMessage = '"'+message.content + '" is currently on cooldown for another ' + onCooldown + ' seconds!';
            dmUser(message, cooldownMessage);
          }
        });
      }
    }
    ///////////////////////////////////////////////////////////////////////////
  });

  // Log the bot in
  client.login(token);
}).on('error', function(e) {
  console.log(e);
});
cache.connect();

// Converts seconds to human-readable time
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

// Starts watching for streams, updates every twitchUpdateIntervalSeconds
function watchForTwitchStreams()
{
  findLiveStreams(handleStreamResults);
  setTimeout(watchForTwitchStreams, twitchUpdateIntervalSeconds*1000);
}

// Connect to Twitch to pull a list of currently live speedrun streams for configured game/channels
function findLiveStreams(callback)
{
  var search = {
    url: 'https://api.twitch.tv/kraken/streams?limit=100&game='+encodeURIComponent(twitchGameName)+'&channel='+encodeURIComponent(twitchChannels.join()),
    headers: {'Client-ID': twitchClientId}
  };

  request(search, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var info = JSON.parse(body);
      if (info._total > 0) {
        // Attempt to automatically filter out non-speedrun streams by title
        var filteredStreams = info.streams.filter(function (item) {
          return !(twitchStatusFilters.test(item.channel.status));
        });
        callback(null, filteredStreams);
      }
    } else {
      console.log('Error finding live twitch streams: ', error); // Print the error if one occurred
      console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
      callback(error);
    }
  });
}

function handleStreamResults(err, streams)
{
  if (err || !streams) return;

  streams.forEach(function(stream) {
    // Only send an alert message if this stream was not already live
    var cacheKey = md5('livestream-' + stream.channel.name);
    cache.get(cacheKey, function(err, currentStream) {
      if (err) {
        console.log(err);
      } else if (currentStream) {
        // cache hit, stream was already online, check for title change
        currentStream = JSON.parse(currentStream);
        if (currentStream.channel.status !== stream.channel.status) {
          alertsChannel.send(':arrows_counterclockwise: **NEW TITLE** :: ' + stream.channel.url + ' :: *' + stream.channel.status + '*');
        }
      } else {
        // stream is newly live
        alertsChannel.send(':arrow_forward: **NOW LIVE** :: ' + stream.channel.url + ' :: *' + stream.channel.status + '*');
      }

      // add back to cache, update timeout
      cache.set(cacheKey, JSON.stringify(stream), handleCacheSet, twitchOfflineToleranceSeconds);
    });
  });
}

// Connect via IRC to SRL and watch for races
function watchForSrlRaces()
{
  // Connect to SRL IRC server
  var client = new irc.Client(srlIrcServer, srlUsername, {
    channels: ['#speedrunslive']
  });

  // Listen for messages from RaceBot in the main channel
  client.addListener('message#speedrunslive', function (from, message) {
    if (from === 'RaceBot') {
      var raceChannel = message.match(/srl\-([a-z0-9]{5})/),
        srlUrl;
      if (raceChannel) {
        srlUrl = 'http://www.speedrunslive.com/race/?id='+raceChannel[1];
      }
      var goal = message.match(/\-\s(.+)\s\|/);

      if (message.startsWith('Race initiated for ' + srlGameName + '. Join')) {
        alertsChannel.send('**SRL Race Started** :: *#' + raceChannel[0] + '* :: A race was just started for ' + srlGameName + '! | ' + srlUrl);
      } else if (message.startsWith('Goal Set: ' + srlGameName + ' - ')) {
        alertsChannel.send('**SRL Race Goal Set** :: *#' + raceChannel[0] + '* ::  __' + goal[1] + '__ | ' + srlUrl);
      } else if (message.startsWith('Race finished: ' + srlGameName + ' - ')) {
        alertsChannel.send('**SRL Race Finished** :: *#' + raceChannel[0] + '* :: __' + goal[1] + '__ | ' + srlUrl);
      } else if (message.startsWith('Rematch initiated: ' + srlGameName + ' - ')) {
        alertsChannel.send('**SRL Rematch** :: *#' + raceChannel[0] + '* :: __' + goal[1] + '__ | ' + srlUrl);
      }
    }
  });

  client.addListener('error', function(message) {
    console.error('error from SRL IRC Server: ', message);
  });
}

// catch Promise errors
process.on('unhandledRejection', console.error);

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

// Read/parse SRC category information
function readSrcCategories(filePath)
{
  var categories = {};
  var srcCategories = fs.readFileSync(filePath, 'utf-8');
  srcCategories = srcCategories.toString().split('|||||');

  // Re-index subcategories by their main category
  srcCategories.forEach(function(category, index) {
    if (category) {
      category = JSON.parse(category);
      if (/no/i.test(category.name)) {
        categories.nmg = category;
      } else {
        categories.mg = category;
      }
    }
  });

  return categories;
}

// Extract main/sub category codes from a command
function parseSrcCategory(text, callback)
{
  var parsed = text.match(/\s(nmg|mg)\s(.+)/);
  if (!parsed || parsed[1] === undefined || parsed[2] === undefined || !parsed[1] || !parsed[2]) {
    return callback("Not a valid category.");
  }

  callback(null, {main: parsed[1].toLowerCase(), sub: parsed[2].toLowerCase()});
}

// Given a category/subcategory, find the run in the response from SRC
// and format a response
function findSrcRun(data, category, subcategory)
{
  if (data && data.data) {
    // find the run matching this search
    var run = data.data.find(function(r) {
      return ((r.run.category === category.id) && (r.run.values[subcategory.varId] === subcategory.id));
    });

    if (run && run.run) {
      var runner = run.players.data[0].names.international;
      var runtime = run.run.times.primary_t;
      var response = 'The current personal best for **' + runner + '** in *' + category.name + ' | ' + subcategory.name
                  + '* is **' + runtime.toString().toHHMMSS() + '**. Ranking: ' + run.place
                  + ' | ' + run.run.weblink;
      return response;
    } else {
      // no PB found in this category for this user
      return 'No personal best found for this user/category!';
    }
  } else {
    console.log('Unexpected response received from SRC: ' + data);
  }

  return;
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
  cache.set(md5(command), Date.now(), handleCacheSet, cooldownTime);
}

function dmUser(originalMessage, newMessage)
{
  // check that this isn't already a DM before sending
  if (originalMessage.channel.type === 'dm') {
    originalMessage.channel.send(newMessage);
  } else {
    originalMessage.member.createDM()
      .then(channel => {
        channel.send(newMessage);
      })
      .catch(console.log);
  }
}

function handleCacheSet(error, result) {}