/**
 * ALttP Discord Bot
 *   General TODOs
 *     - Extract basic functionality to separate modules that both discord/twitch can utilize
 *     - Auto-notify nmg-race for weekly
 *     - Create per-guild configurations
 *       (so each can have their own prefix, cooldowns, allowed roles, etc. without the need for separate bot accounts)
 */

// Import modules
const request = require('request'),
  irc = require('irc'),
  fs = require('fs'),
  path = require('path'),
  memcache = require('memcache'),
  md5 = require('md5'),
  Discord = require('discord.js');
  staticCommands = require('./static-commands.js');

// Read in bot configuration
let config = require('./config.json');

// File paths for extra configs
let confPath = path.join(__dirname, 'conf');
let twitchStreamsFilePath = path.join(confPath, 'twitch_streams'),
  srcCategoriesFilePath = path.join(confPath, 'src_categories');

// Read in list of Twitch streams and watch for changes
let twitchChannels = fs.readFileSync(twitchStreamsFilePath, 'utf-8').toString().split('\n');
fs.watchFile(twitchStreamsFilePath, (curr, prev) => {
  if (curr.mtime !== prev.mtime) {
    twitchChannels = fs.readFileSync(twitchStreamsFilePath, 'utf-8').toString().split('\n');
  }
});

// Read in current category info on SRC (run src.js to refresh)
let indexedCategories = readSrcCategories(srcCategoriesFilePath);

// Set up Discord client
const client = new Discord.Client();
let alertsChannel;

// Connect to cache
const cache = new memcache.Client();
cache.on('connect', () => {
  init();
}).on('error', e => {
  console.error('Cache Error', e);
}).connect();

// Start the bot
function init()
{
  // Set up the commands the bot will natively handle
  const commands = {
    // Allow members to request role additions/removals for allowed roles
    'role': msg => {
      // make sure there are allowed roles defined
      if (typeof config.discord.allowedRolesForRequest === undefined || config.discord.allowedRolesForRequest.length === 0) {
        return msg.reply('No roles are currently allowed to be added/removed by members.');
      }

      let validRoles = config.discord.allowedRolesForRequest.split('|');

      if (msg.content === config.discord.cmdPrefix+'role') {
        return dmUser(msg, `Useage: ${config.discord.cmdPrefix}role {add|remove} {${config.discord.allowedRolesForRequest}}`);
      }

      // parse+validate action+role (use original case from message because roles are case-sensitive)
      let roleName = msg.originalContent.match(/role\s(add|remove)\s([a-z0-9\-]+)/i);
      if (!roleName) {
        return dmUser(msg, `You must include a role name! *e.g. ${config.discord.cmdPrefix}role ${roleName[1]} ${validRoles[0]}*`);
      } else {
        let tester = new RegExp(config.discord.allowedRolesForRequest, 'i');
        if (tester.test(roleName[2])) {
          // make sure this message is in a guild channel they're a member of
          if (!msg.guild) return;

          // find the role in the member's guild
          let role = msg.guild.roles.find('name', roleName[2]);

          if (!role) {
            return dmUser(msg, `${roleName[2]} is not a role on this server!`);
          }

          // add/remove the role and DM the user the results
          if (roleName[1] === 'add') {
            msg.member.addRole(role)
              .then(requestingMember => {
                requestingMember.createDM()
                  .then(channel => {
                    channel.send(`You have successfully been added to the ${roleName[2]} group!`)
                  })
                  .catch(console.error)
              })
              .catch(console.log);
          } else if (roleName[1] === 'remove') {
            msg.member.removeRole(role)
              .then(requestingMember => {
                requestingMember.createDM()
                  .then(channel => {
                    channel.send(`You have successfully been removed from the ${roleName[2]} group!`)
                  })
                  .catch(console.error)
              })
              .catch(console.error);
          } else {
            return dmUser(msg, `You must use add/remove after the role command! *e.g. ${config.discord.cmdPrefix}role add ${validRoles[0]}*`);
          }
        } else {
          dmUser(msg, `${roleName[1]} is not a valid role name! The roles allowed for request are: ${validRoles.join(',')}`);
        }
      }
    },
    // Speedrun.com API Integration (leaderboard lookups)
    'wr': msg => {
      if (msg.content === config.discord.cmdPrefix+'wr') {
        return dmUser(msg, `Useage: ${config.discord.cmdPrefix}wr {nmg/mg} {subcategory-code}`);
      }

      parseSrcCategory(msg.content, function(err, res) {
        if (err) {
          return dmUser(msg, err);
        }

        // look up info for this sub-category in local cache
        // @todo move to its own function, multiple cases use this
        let category = indexedCategories[res.main];
        let subcategory = category.subcategories.find(function(s) {
          return s.code === res.sub;
        });

        if (!subcategory) {
          return dmUser(msg, 'Not a valid sub-category name! Codes are listed here: https://github.com/greenham/alttp-bot/blob/master/README.md#category-codes');
        }

        // Make sure this command isn't on cooldown in this channel
        let cooldownKey = msg.content + msg.channel.id;
        isOnCooldown(cooldownKey, config.discord.srcCmdCooldown, function(onCooldown) {
          if (onCooldown === false) {
            let wrSearchReq = {
              url: `http://www.speedrun.com/api/v1/leaderboards/${config.src.gameSlug}/category/${category.id}?top=1&embed=players&var-${subcategory.varId}=${subcategory.id}`,
              headers: {'User-Agent': config.src.userAgent}
            };

            // check for cache of this request
            let wrCacheKey = md5(JSON.stringify(wrSearchReq));
            cache.get(wrCacheKey, function(err, res) {
              if (!err && res !== null) {
                // cache hit
                msg.channel.send(res);
              } else {
                request(wrSearchReq, function(error, response, body) {
                  if (!error && response.statusCode == 200) {
                    let data = JSON.parse(body);
                    if (data && data.data && data.data.runs) {
                      let run = data.data.runs[0].run;
                      let runner = data.data.players.data[0].names.international;
                      let runtime = run.times.primary_t;
                      let wrResponse = `The current world record for *${category.name} | ${subcategory.name}`
                                  + `* is held by **${runner}** with a time of ${runtime.toString().toHHMMSS()}.`
                                  + ` ${run.weblink}`;

                      msg.channel.send(wrResponse)
                        .then(sentmsg => placeOnCooldown(cooldownKey, config.discord.srcCmdCooldown))
                        .catch(console.error);

                      // cache the response
                      cache.set(wrCacheKey, wrResponse, handleCacheSet, 3600);
                    } else {
                      console.error('Unexpected response/format from SRC: ', data);
                    }
                  } else if (response && response.statusCode == 404) {
                      return msg.channel.send(`No record found for *${category.name} | ${subcategory.name}*`);
                  } else {
                    console.log('Error while calling SRC API: ', error);
                  }
                });
              }
            });
          } else {
            // DM the user that it's on CD
            return dmUser(msg, `"${msg.content}" is currently on cooldown for another ${onCooldown} seconds!`);
          }
        });
      });
    },
    'pb': msg => {
      if (msg.content === config.discord.cmdPrefix+'pb') {
        return dmUser(msg, `Useage: ${config.discord.cmdPrefix}pb {speedrun.com-username} {nmg/mg} {subcategory-code}`);
      }

      //let command, username, majorCat, minorCat;
      let [command, username, majorCat, minorCat] = msg.content.split(' ');
      //let commandParts = msg.content.split(' ');
      if (!command || username === undefined || majorCat === undefined || minorCat === undefined || (majorCat != 'nmg' && majorCat != 'mg')) {
        return dmUser(msg, `Useage: ${config.discord.cmdPrefix}pb {speedrun.com-username} {nmg/mg} {subcategory-code}`);
      }

      // look up info for this sub-category in local cache
      let category = indexedCategories[majorCat];
      let subcategory = category.subcategories.find(function(s) {
        return s.code === minorCat;
      });

      if (!subcategory) {
        return dmUser(msg, 'Not a valid sub-category name! Codes are listed here: https://github.com/greenham/alttp-bot/blob/master/README.md#category-codes');
      }

      // Make sure this command isn't on cooldown
      let cooldownKey = msg.content + msg.channel.id;
      isOnCooldown(cooldownKey, config.discord.srcCmdCooldown, function(onCooldown) {
        if (onCooldown === false) {
          // look up user on SRC, pull in PB's
          let userSearchReq = {
            url: `http://www.speedrun.com/api/v1/users/${encodeURIComponent(username)}/personal-bests?embed=players`,
            headers: {'User-Agent': config.src.userAgent}
          };

          // check for cache of this request
          let cacheKey = md5(JSON.stringify(userSearchReq));
          cache.get(cacheKey, function(err, res) {
            if (!err && res !== null) {
              // cache hit
              response = findSrcRun(JSON.parse(res), category, subcategory);
              if (response) {
                msg.channel.send(response);
              }
            } else {
              request(userSearchReq, function(error, response, body) {
                if (!error && response.statusCode == 200) {
                  let data = JSON.parse(body);

                  // add response to cache
                  cache.set(cacheKey, JSON.stringify(data), handleCacheSet, 3600);

                  response = findSrcRun(data, category, subcategory);
                  if (response) {
                    msg.channel.send(response);
                  }
                } else if (response && response.statusCode == 404) {
                  return msg.channel.send(`No user found matching *${username}*.`);
                } else {
                  console.error('Error while calling SRC API: ', error); // Print the error if one occurred
                }
              });
            }

            placeOnCooldown(cooldownKey, config.discord.srcCmdCooldown);
          });
        } else {
          // DM the user that it's on CD
          return dmUser(msg, `"${msg.content}" is currently on cooldown for another ${onCooldown} seconds!`);
        }
      });
    },
    // @todo implement pulling in category rules from SRC
    'rules': msg => {
    }
  };

  // Wait for bot to be ready before watching streams/races
  client.on('ready', () => {
    console.log(config.botName + ' Online');

    // Find the text channel where we'll be posting alerts
    alertsChannel = client.channels.find('name', config.discord.alertsChannelName);
    if (config.discord.alertOnConnect === true) alertsChannel.send(config.botName + ' has connected. :white_check_mark:');

    // Watch allthethings
    if (config.discord.enableLivestreamAlerts) watchForTwitchStreams();
    if (config.discord.enableRaceAlerts) watchForSrlRaces();
  }).on('message', msg => {
    // Listen for commands for the bot to respond to
    msg.originalContent = msg.content;
    msg.content = msg.content.toLowerCase();

    // Make sure it starts with the configured prefix
    if (!msg.content.startsWith(config.discord.cmdPrefix)) return;

    // Check for native or static command
    if (commands.hasOwnProperty(msg.content.slice(config.discord.cmdPrefix.length).split(' ')[0])) {
      commands[msg.content.slice(config.discord.cmdPrefix.length).split(' ')[0]](msg);
    } else if (staticCommands.exists(msg.content)) {
      // Make sure this command isn't on cooldown in this particular channel
      let cooldownKey = msg.content + msg.channel.id;
      isOnCooldown(cooldownKey, config.discord.textCmdCooldown, function(onCooldown) {
        if (onCooldown === false) {
          msg.channel.send(staticCommands.get(msg.content))
            .then(sentMessage => placeOnCooldown(cooldownKey, config.discord.textCmdCooldown))
            .catch(console.error);
        } else {
          // DM the user that it's on CD
          dmUser(msg, `"{msg.content}" is currently on cooldown for another {onCooldown} seconds!`);
        }
      });
    } else {
      // ignore
    }
  });

  // Log the bot in
  client.login(config.discord.token);
}

// Starts watching for streams, updates every config.twitch.updateIntervalSeconds
function watchForTwitchStreams()
{
  findLiveStreams(handleStreamResults);
  setTimeout(watchForTwitchStreams, config.twitch.updateIntervalSeconds*1000);
}

// Connect to Twitch to pull a list of currently live speedrun streams for configured game/channels
function findLiveStreams(callback)
{
  let search = {
    url: 'https://api.twitch.tv/kraken/streams?limit=100&game='+encodeURIComponent(config.twitch.gameName)+'&channel='+encodeURIComponent(twitchChannels.join()),
    headers: {'Client-ID': config.twitch.clientId}
  };

  let tester = new RegExp(config.twitch.statusFilters, 'i');

  request(search, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      let info = JSON.parse(body);
      if (info._total > 0) {
        // Attempt to automatically filter out non-speedrun streams by title
        let filteredStreams = info.streams.filter(function (item) {
          return !(tester.test(item.channel.status));
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

// Handles sending of live / title change alerts
function handleStreamResults(err, streams)
{
  if (err || !streams) return;

  streams.forEach(function(stream) {
    // Only send an alert message if this stream was not already live
    let cacheKey = md5('livestream-' + stream.channel.name);
    cache.get(cacheKey, function(err, currentStream) {
      if (err) {
        console.error(err);
      } else if (currentStream !== null) {
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
      cache.set(cacheKey, JSON.stringify(stream), handleCacheSet, config.twitch.offlineToleranceSeconds);
    });
  });
}

// Connect via IRC to SRL and watch for races
function watchForSrlRaces()
{
  // Connect to SRL IRC server
  let client = new irc.Client(config.srl.ircServer, config.srl.username, {
    password: config.srl.password,
    channels: ['#speedrunslive']
  });

  // Connect to SRL IRC server
  /*var client = new irc.Client(srlIrcServer, srlUsername, {
    password: srlPassword,
    autoRejoin: false,
    retryCount: 0,
    retryDelay: 10000,
    floodProtection: true,
    floodProtectionDelay: 1000,
    debug: true,
    showErrors: true,
    channels: ['#speedrunslive']
  });*/

  // Listen for messages from RaceBot in the main channel
  client.addListener('message#speedrunslive', function (from, message) {
    if (from === 'RaceBot') {
      let raceChannel = message.match(/srl\-([a-z0-9]{5})/),
        srlUrl;
      if (raceChannel) {
        srlUrl = 'http://www.speedrunslive.com/race/?id='+raceChannel[1];
      }
      let goal = message.match(/\-\s(.+)\s\|/);

      if (message.startsWith('Race initiated for ' + config.srl.gameName + '. Join')) {
        alertsChannel.send('**SRL Race Started** :: *#' + raceChannel[0] + '* :: A race was just started for ' + config.srl.gameName + '! | ' + srlUrl);
      } else if (message.startsWith('Goal Set: ' + config.srl.gameName + ' - ')) {
        alertsChannel.send('**SRL Race Goal Set** :: *#' + raceChannel[0] + '* ::  __' + goal[1] + '__ | ' + srlUrl);
      } else if (message.startsWith('Race finished: ' + config.srl.gameName + ' - ')) {
        alertsChannel.send('**SRL Race Finished** :: *#' + raceChannel[0] + '* :: __' + goal[1] + '__ | ' + srlUrl);
      } else if (message.startsWith('Rematch initiated: ' + config.srl.gameName + ' - ')) {
        alertsChannel.send('**SRL Rematch** :: *#' + raceChannel[0] + '* :: __' + goal[1] + '__ | ' + srlUrl);
      }
    }
  });

  client.addListener('error', function(message) {
    console.error('error from SRL IRC Server: ', message);
  });
}

// Read/parse SRC category information
function readSrcCategories(filePath)
{
  let categories = {};
  let srcCategories = fs.readFileSync(filePath, 'utf-8');
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
  let parsed = text.match(/\s(nmg|mg)\s(.+)/);
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
    let run = data.data.find(function(r) {
      return ((r.run.category === category.id) && (r.run.values[subcategory.varId] === subcategory.id));
    });

    if (run && run.run) {
      let runner = run.players.data[0].names.international;
      let runtime = run.run.times.primary_t;
      let response = 'The current personal best for **' + runner + '** in *' + category.name + ' | ' + subcategory.name
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
  let now = Date.now();
  let onCooldown = false;

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

// Converts seconds to human-readable time
String.prototype.toHHMMSS = function () {
  let sec_num = parseInt(this, 10); // don't forget the second param
  let hours   = Math.floor(sec_num / 3600);
  let minutes = Math.floor((sec_num - (hours * 3600)) / 60);
  let seconds = sec_num - (hours * 3600) - (minutes * 60);

  if (hours   < 10) {hours   = "0"+hours;}
  if (minutes < 10) {minutes = "0"+minutes;}
  if (seconds < 10) {seconds = "0"+seconds;}
  return hours+':'+minutes+':'+seconds;
}

// catch Promise errors
process.on('unhandledRejection', console.error);

process.on('exit', (code) => {cache.close()});
