/**
 * ALttP Discord Bot
  */

// Import modules
const request = require('request'),
  irc = require('irc'),
  fs = require('fs'),
  path = require('path'),
  moment = require('moment'),
  Discord = require('discord.js'),
  staticCommands = require('./lib/static-commands.js'),
  cooldowns = require('./lib/cooldowns.js'),
  StreamAlerts = require('./lib/stream-alerts.js'),
  RaceAlerts = require('./lib/race-alerts.js'),
  src = require('./lib/src.js'),
  timers = require('./lib/timers.js'),
  schedule = require('node-schedule');

// Read in bot configuration
let config = require('./config.json');

// Set up Twitch stream watcher
const streamWatcher = new StreamAlerts(config.streamAlerts);

// Set up SRL Race watcher
const raceWatcher = new RaceAlerts(config.srl);

// Set up the commands the bot will natively handle
const commands = {
  // Allow members to request role additions/removals for allowed roles
  'role': (msg, guildConfig) => {
    // make sure there are allowed roles defined
    if (typeof guildConfig.allowedRolesForRequest === undefined || guildConfig.allowedRolesForRequest.length === 0) {
      return msg.reply('No roles are currently allowed to be added/removed by members.');
    }

    let validRoles = guildConfig.allowedRolesForRequest.split('|');

    if (msg.content === guildConfig.cmdPrefix+'role') {
      return dmUserFromMsg(msg, `Useage: ${guildConfig.cmdPrefix}role {add|remove} {${guildConfig.allowedRolesForRequest}}`);
    }

    // parse+validate action+role (use original case from message because roles are case-sensitive)
    let roleName = msg.originalContent.match(/role\s(add|remove)\s([a-z0-9\-]+)/i);
    if (!roleName) {
      return dmUserFromMsg(msg, `You must include a role name! *e.g. ${guildConfig.cmdPrefix}role ${roleName[1]} ${validRoles[0]}*`);
    } else {
      let tester = new RegExp(guildConfig.allowedRolesForRequest, 'i');
      if (tester.test(roleName[2])) {
        // make sure this message is in a guild channel they're a member of
        if (!msg.guild) return;

        // find the role in the member's guild
        let role = msg.guild.roles.find('name', roleName[2]);

        if (!role) {
          return dmUserFromMsg(msg, `${roleName[2]} is not a role on this server!`);
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
          return dmUserFromMsg(msg, `You must use add/remove after the role command! *e.g. ${guildConfig.cmdPrefix}role add ${validRoles[0]}*`);
        }
      } else {
        dmUserFromMsg(msg, `${roleName[1]} is not a valid role name! The roles allowed for request are: ${validRoles.join(',')}`);
      }
    }
  },
  // Speedrun.com API Integration (leaderboard lookups)
  'wr': (msg, guildConfig) => {
    if (msg.content === guildConfig.cmdPrefix+'wr') {
      return dmUserFromMsg(msg, `Useage: ${guildConfig.cmdPrefix}wr {nmg/mg} {subcategory-code}`);
    }

    let [command, majorCat, minorCat] = msg.content.split(' ');
    if (!command || !majorCat || !minorCat || (majorCat !== 'nmg' && majorCat !== 'mg')) {
      return dmUserFromMsg(msg, `Useage: ${guildConfig.cmdPrefix}wr {nmg/mg} {subcategory-code}`);
    }

    let cooldownKey = msg.content + msg.channel.id;
    src.findWR(config.src.gameSlug, majorCat, minorCat)
      .then(result => {
        msg.reply(result).then(sentMsg => cooldowns.set(cooldownKey, guildConfig.srcCmdCooldown));
      })
      .catch(console.error);
  },
  'pb': (msg, guildConfig) => {
    if (msg.content === guildConfig.cmdPrefix+'pb') {
      return dmUserFromMsg(msg, `Useage: ${guildConfig.cmdPrefix}pb {speedrun.com-username} {nmg/mg} {subcategory-code}`);
    }

    let [command, username, majorCat, minorCat] = msg.content.split(' ');
    if (!command || !username || !majorCat || !minorCat || (majorCat !== 'nmg' && majorCat !== 'mg')) {
      return dmUserFromMsg(msg, `Useage: ${guildConfig.cmdPrefix}pb {speedrun.com-username} {nmg/mg} {subcategory-code}`);
    }

    let cooldownKey = msg.content + msg.channel.id;
    src.findPB(username, majorCat, minorCat)
      .then(result => {
        msg.reply(result).then(sentMsg => cooldowns.set(cooldownKey, guildConfig.srcCmdCooldown));
      })
      .catch(console.error);
  },
  // @todo implement pulling in category rules from SRC
  'rules': (msg, guildConfig) => {
  }
};

// Set up Discord client
const client = new Discord.Client();
// Wait for bot to be ready before watching streams/races
client.on('ready', () => {
  console.log(config.botName + ' Online');

  // Set up alerts for each guild we're a member of
  client.guilds.forEach((guild) => {
    if (guild.id !== "default") {
      initGuild(guild, config);
    }
  });
// Listen for commands for the bot to respond to across all channels
}).on('message', msg => {
  msg.originalContent = msg.content;
  msg.content = msg.content.toLowerCase();

  // Find the guild config for this msg, use default if no guild (DM)
  let guildConfig = (msg.guild) ? config.discord.guilds[msg.guild.id] : config.discord.guilds.default;

  // Make sure it starts with the configured prefix
  if (!msg.content.startsWith(guildConfig.cmdPrefix)) return;

  // And that it's not on cooldown
  let cooldownKey = msg.content + msg.channel.id;
  cooldowns.get(cooldownKey, guildConfig.textCmdCooldown)
    .then(onCooldown => {
      if (onCooldown === false) {
        // Not on CD, check for native or static command
        let commandNoPrefix = msg.content.slice(guildConfig.cmdPrefix.length).split(' ')[0];
        console.log(`'${commandNoPrefix}' received in ${guildConfig.internalName}#${msg.channel.name} from @${msg.author.username}`);
        if (commands.hasOwnProperty(commandNoPrefix)) {
          commands[commandNoPrefix](msg, guildConfig);
        } else if (staticCommands.exists(commandNoPrefix)) {
          let result = staticCommands.get(commandNoPrefix);
          msg.channel.send({embed: {
            "title": commandNoPrefix,
            "color": 0xff9f25,
            "description": result
          }}).then(sentMessage => cooldowns.set(cooldownKey, guildConfig.textCmdCooldown))
          .catch(console.error);
        } else {
          // Not a command we recognize, ignore
        }
      } else {
        // DM the user that it's on CD
        dmUserFromMsg(msg, `**${msg.content}** is currently on cooldown for another *${onCooldown} seconds!*`);
      }
    })
    .catch(console.error);
// Create an event listener for new guild members
}).on('guildMemberAdd', member => {
  console.log(`A new member has joined '${member.guild.name}': ${member.displayName}`);
  // Check to see if this guild has welcome DM's enabled
  let guildConfig = (member.guild) ? config.discord.guilds[member.guild.id] : config.discord.guilds.default;
  if (guildConfig.enableWelcomeDM === true && guildConfig.welcomeDMFile) {
    console.log('Guild has welcome DMs enabled, fetching message...');
    // Send the member a DM using the configured message for the guild
    let filePath = path.join(__dirname, 'conf', guildConfig.welcomeDMFile);
    let welcomeMessage = fs.readFileSync(filePath, 'utf-8').toString();
    if (welcomeMessage) {
      console.log('Sending welcome DM to user...');
      dmUser(member, welcomeMessage);
    }
  }
// Log the bot in
}).login(config.discord.token);

function initGuild(guild, config)
{
  let guildConfig = config.discord.guilds[guild.id];

  // Find the text channel(s) where we'll be posting alerts
  let alertsChannel = guild.channels.find('name', guildConfig.alertsChannelName);
  if (guildConfig.alertOnConnect === true) alertsChannel.send(config.botName + ' has connected. :white_check_mark:');

  // Watch + alert for Twitch streams
  if (alertsChannel && guildConfig.enableLivestreamAlerts) {
    let embed = new Discord.RichEmbed();
    streamWatcher.on('live', stream => {
      embed.setStreamAlertDefaults(stream)
        .setTitle(`Now live at ${stream.channel.url}!`)
        .setColor('#339e31')
        .setImage(`${stream.preview.medium}?r=${moment().valueOf()}`);
      alertsChannel.send({embed});
    }).on('title', stream => {
      embed.setStreamAlertDefaults(stream)
        .setTitle(`Changed title:`)
        .setColor('#dedede')
        .setImage(null)
      alertsChannel.send({embed});
    }).watch();
  }

  // Watch + alert for SRL races
  if (alertsChannel && guildConfig.enableRaceAlerts) {
    let embed = new Discord.RichEmbed();
    raceWatcher.on('init', (raceChannel, srlUrl) => {
      embed.setRaceAlertDefaults(raceChannel, srlUrl).setDescription(`A race was just started for *${config.srl.gameName}*!`);
      alertsChannel.send({embed});
    }).on('goal', (raceChannel, goal, srlUrl) => {
      embed.setRaceAlertDefaults(raceChannel, srlUrl).setDescription(`Goal was set to: **${goal}**`);
      alertsChannel.send({embed});
    }).on('done', (raceChannel, goal, srlUrl) => {
      embed.setRaceAlertDefaults(raceChannel, srlUrl).setDescription('Race finished!');
      alertsChannel.send({embed});
    }).on('rematch', (raceChannel, goal, srlUrl) => {
      embed.setRaceAlertDefaults(raceChannel, srlUrl).setDescription('Rematch initiated!');
      alertsChannel.send({embed});
    }).on('error', console.error)
    .watch();
  }

  // Schedule timers for some special messages / commands
  //
  // Weekly NMG Race Alert: Every Sunday at 11 AM Pacific /
  if (alertsChannel && guildConfig.enableWeeklyRaceAlert) {
    let timeToSchedule = {dayOfWeek: 0, hour: 11, minute: 0};
    let weeklyRaceAlertRole = guild.roles.find('name', guildConfig.weeklyRaceAlertRole);
    let j = schedule.scheduleJob(timeToSchedule, () => {
      console.log(`Sending weekly alert event at ${moment().format('MMMM Do YYYY, h:mm:ss a')} to ${guild.name}`);
      let randomEmoji = guild.emojis.random();
      alertsChannel.send([
        weeklyRaceAlertRole,
        `The weekly Any% NMG Race is starting in 1 Hour! ${randomEmoji} Information on joining SRL can be found here: http://www.speedrunslive.com/faq/#join`
      ]);
    });
  }
}

function dmUserFromMsg(originalMessage, newMessage)
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

function dmUser(user, message)
{
  user.createDM()
    .then(channel => {
      channel.send(message);
    })
    .catch(console.log);
}

Discord.RichEmbed.prototype.setStreamAlertDefaults = function (stream) {
  return this.setAuthor(stream.channel.display_name, stream.channel.logo)
    .setURL(stream.channel.url)
    .setDescription(stream.channel.status)
    .setTimestamp();
};

Discord.RichEmbed.prototype.setRaceAlertDefaults = function (raceChannel, srlUrl) {
  return this.setTitle(`SRL Race #${raceChannel}`)
    .setURL(srlUrl)
    .setThumbnail('http://i.imgur.com/8nqgDcI.png')
    .setColor('#f8e47f')
    .setFooter(`#${raceChannel}`)
    .setTimestamp();
};

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
};

// catch Promise errors
process.on('unhandledRejection', console.error);