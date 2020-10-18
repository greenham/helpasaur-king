/**
 * ALttP Discord Bot
 * https://discord.com/api/oauth2/authorize?client_id=719535509386559498&scope=bot&permissions=268486720
 */

// Import modules
const Discord = require("discord.js"),
  moment = require("moment"),
  schedule = require("node-schedule"),
  db = require("./db"),
  src = require("./lib/src.js"),
  staticCommands = require("./lib/commands.js"),
  Cooldowns = require("cooldowns"),
  RaceAlerts = require("./lib/race-alerts.js"),
  StreamAlerts = require("./lib/stream-alerts.js");

// Read internal configuration
let config = require("./config.json");
const cooldowns = new Cooldowns("helpa-discord");

// Connect to DB
db.connect(config.db.host, config.db.db, (err) => {
  if (!err) {
    // Read external configuration from DB
    db.get()
      .collection("config")
      .findOne({ default: true }, (err, userConfig) => {
        if (!err) {
          config = Object.assign(config, userConfig);
          init(config);
        } else {
          console.error(`Unable to read config from database: ${err}`);
          process.exit(1);
        }
      });
  } else {
    console.error("Unable to connect to Mongo! Check config.json");
    process.exit(1);
  }
});

const init = (config) => {
  // Set up Twitch stream watcher
  const runnerWatcher = new StreamAlerts(config.streamAlerts);

  // Set up SRL Race watcher
  const raceWatcher = new RaceAlerts(config.srl);

  // Set up the commands the bot will natively handle
  const commands = {
    // Allow members to request role additions/removals for allowed roles
    role: (msg, guildConfig) => {
      // make sure there are allowed roles defined
      if (
        typeof guildConfig.allowedRolesForRequest === undefined ||
        guildConfig.allowedRolesForRequest.length === 0
      ) {
        return msg.reply(
          "No roles are currently allowed to be added/removed by members."
        );
      }

      let validRoles = guildConfig.allowedRolesForRequest.split("|");

      if (msg.content === guildConfig.cmdPrefix + "role") {
        return dmUserFromMsg(
          msg,
          `Useage: ${guildConfig.cmdPrefix}role {add|remove} {${guildConfig.allowedRolesForRequest}}`
        );
      }

      // parse+validate action+role (use original case from message because roles are case-sensitive)
      let roleName = msg.originalContent.match(
        /role\s(add|remove)\s([a-z0-9\-]+)/i
      );
      if (!roleName) {
        return dmUserFromMsg(
          msg,
          `You must include a role name! *e.g. ${guildConfig.cmdPrefix}role ${roleName[1]} ${validRoles[0]}*`
        );
      } else {
        let tester = new RegExp(guildConfig.allowedRolesForRequest, "i");
        if (tester.test(roleName[2])) {
          // make sure this message is in a guild channel they're a member of
          if (!msg.guild) return;

          // find the role in the member's guild
          let role = msg.guild.roles.find((x) => x.name === roleName[2]);

          if (!role) {
            return dmUserFromMsg(
              msg,
              `${roleName[2]} is not a role on this server!`
            );
          }

          // add/remove the role and DM the user the results
          if (roleName[1] === "add") {
            msg.member
              .addRole(role)
              .then((requestingMember) => {
                requestingMember
                  .createDM()
                  .then((channel) => {
                    channel.send(
                      `You have successfully been added to the ${roleName[2]} group!`
                    );
                  })
                  .catch(console.error);
              })
              .catch(console.log);
          } else if (roleName[1] === "remove") {
            msg.member
              .removeRole(role)
              .then((requestingMember) => {
                requestingMember
                  .createDM()
                  .then((channel) => {
                    channel.send(
                      `You have successfully been removed from the ${roleName[2]} group!`
                    );
                  })
                  .catch(console.error);
              })
              .catch(console.error);
          } else {
            return dmUserFromMsg(
              msg,
              `You must use add/remove after the role command! *e.g. ${guildConfig.cmdPrefix}role add ${validRoles[0]}*`
            );
          }
        } else {
          dmUserFromMsg(
            msg,
            `${
              roleName[1]
            } is not a valid role name! The roles allowed for request are: ${validRoles.join(
              ","
            )}`
          );
        }
      }
    },
    // Speedrun.com API Integration (leaderboard lookups)
    wr: (msg, guildConfig) => {
      if (msg.content === guildConfig.cmdPrefix + "wr") {
        return dmUserFromMsg(
          msg,
          `Useage: ${guildConfig.cmdPrefix}wr {nmg/mg} {subcategory-code}`
        );
      }

      let [command, majorCat, minorCat] = msg.content.split(" ");
      if (
        !command ||
        !majorCat ||
        !minorCat ||
        (majorCat !== "nmg" && majorCat !== "mg")
      ) {
        return dmUserFromMsg(
          msg,
          `Useage: ${guildConfig.cmdPrefix}wr {nmg/mg} {subcategory-code}`
        );
      }

      let cooldownKey = msg.content + msg.channel.id;
      src
        .findWR(config.src.gameSlug, majorCat, minorCat)
        .then((result) => {
          msg
            .reply(result)
            .then((sentMsg) =>
              cooldowns.placeOnCooldown(cooldownKey, guildConfig.srcCmdCooldown)
            );
        })
        .catch(console.error);
    },
    pb: (msg, guildConfig) => {
      if (msg.content === guildConfig.cmdPrefix + "pb") {
        return dmUserFromMsg(
          msg,
          `Useage: ${guildConfig.cmdPrefix}pb {speedrun.com-username} {nmg/mg} {subcategory-code}`
        );
      }

      let [command, username, majorCat, minorCat] = msg.content.split(" ");
      if (
        !command ||
        !username ||
        !majorCat ||
        !minorCat ||
        (majorCat !== "nmg" && majorCat !== "mg")
      ) {
        return dmUserFromMsg(
          msg,
          `Useage: ${guildConfig.cmdPrefix}pb {speedrun.com-username} {nmg/mg} {subcategory-code}`
        );
      }

      let cooldownKey = msg.content + msg.channel.id;
      src
        .findPB(username, majorCat, minorCat)
        .then((run) => {
          let response = "No personal best found for this user/category!";
          if (run && run.run) {
            let runner = run.players.data[0].names.international;
            let runtime = run.run.times.primary_t;
            response =
              `The current personal best for **${runner}**` +
              ` in *${run.category.name} | ${run.subcategory.name}*` +
              ` is **${runtime.toString().toHHMMSS()}**. Ranking: ${
                run.place
              }` +
              ` | <${run.run.weblink}>`;
          }
          msg
            .reply(response)
            .then((sentMsg) =>
              cooldowns.placeOnCooldown(cooldownKey, guildConfig.srcCmdCooldown)
            );
        })
        .catch(console.error);
    },
    // @todo implement pulling in category rules from SRC
    rules: (msg, guildConfig) => {},
  };

  // Set up Discord client
  const client = new Discord.Client();
  // Wait for bot to be ready before watching streams/races
  client
    .on("ready", () => {
      console.log(config.botName + " Online");
      client.setRandomActivity();

      // Set up alerts for each guild we're a member of
      client.guilds.forEach((guild, index) => {
        // Make sure it's not the dummy default guild and not already initialized and it's configured
        if (
          guild.id !== "default" &&
          !guild.initialized &&
          config.discord.guilds[guild.id]
        ) {
          initGuild(guild, config, (err, res) => {
            if (err) console.error(err);
            if (res)
              console.log(`Successfully initialized guild: ${guild.name}`);
            guild.initialized = res;
            client.guilds[index] = guild;
          });
        }
      });

      // Update our activity to something random every hour
      schedule.scheduleJob({ minute: 0 }, () => {
        client.setRandomActivity();
      });
    })
    // Listen for commands for the bot to respond to across all channels
    .on("message", (msg) => {
      // Ignore messages from unconfigured guilds
      if (msg.guild) {
        if (!config.discord.guilds[msg.guild.id]) {
          return;
        }
      } else if (config.discord.handleDMs === false) {
        return;
      }

      msg.originalContent = msg.content;
      msg.content = msg.content.toLowerCase();

      // Find the guild config for this msg, use default if no guild (DM)
      let guildConfig = msg.guild
        ? config.discord.guilds[msg.guild.id]
        : config.discord.guilds.default;

      // Make sure it starts with the configured prefix
      if (!msg.content.startsWith(guildConfig.cmdPrefix)) return;

      // And that it's not on cooldown
      let cooldownKey = msg.content + msg.channel.id;
      cooldowns
        .isOnCooldown(cooldownKey, guildConfig.textCmdCooldown)
        .then((onCooldown) => {
          if (onCooldown === false) {
            // Not on CD, check for native or static command
            let commandNoPrefix = msg.content
              .slice(guildConfig.cmdPrefix.length)
              .split(" ")[0];
            if (commands.hasOwnProperty(commandNoPrefix)) {
              console.log(
                `'${commandNoPrefix}' received in ${guildConfig.internalName}#${msg.channel.name} from @${msg.author.username}`
              );
              commands[commandNoPrefix](msg, guildConfig);
            } else {
              staticCommands
                .get(commandNoPrefix)
                .then((command) => {
                  if (command && command.response) {
                    console.log(
                      `'${commandNoPrefix}' received in ${guildConfig.internalName}#${msg.channel.name} from @${msg.author.username}`
                    );
                    msg.channel
                      .send({
                        embed: {
                          title: commandNoPrefix,
                          color: 0xff9f25,
                          description: command.response,
                        },
                      })
                      .then((sentMessage) =>
                        cooldowns.placeOnCooldown(
                          cooldownKey,
                          guildConfig.textCmdCooldown
                        )
                      )
                      .catch(console.error);
                  }
                })
                .catch(console.error);
            }
          } else {
            // DM the user that it's on CD
            dmUserFromMsg(
              msg,
              `**${msg.content}** is currently on cooldown for another *${onCooldown} seconds!*`
            );
          }
        })
        .catch(console.error);
    })
    // Handle new members joining one of our guilds
    .on("guildMemberAdd", (member) => {
      // Ignore events from unconfigured guilds
      if (member.guild) {
        if (!config.discord.guilds[member.guild.id]) {
          return;
        }
      } else if (config.discord.handleDMs === false) {
        return;
      }

      console.log(
        `A new member has joined '${member.guild.name}': ${member.displayName}`
      );

      // Check to see if this guild has welcome DM's enabled
      let guildConfig = member.guild
        ? config.discord.guilds[member.guild.id]
        : config.discord.guilds.default;
      if (guildConfig.enableWelcomeDM === true && guildConfig.welcomeDM) {
        // Send the member a DM using the configured message for the guild
        console.log("Guild has welcome DM enabled, sending to user...");
        dmUser(member, guildConfig.welcomeDM);
      }
    })
    // Log guild becoming unavailable (usually due to server outage)
    .on("guildUnavailable", (guild) => {
      console.log(
        `Guild '${guild.name}' is no longer available! Most likely due to server outage.`
      );
    })
    // Log debug messages if enabled
    .on("debug", (info) => {
      if (config.debug === true) {
        console.log(`[${new Date()}] DEBUG: ${info}`);
      }
    })
    // Log disconnect event
    .on("disconnect", (event) => {
      console.log(
        `Web Socket disconnected with code ${event.code} and reason '${event.reason}'`
      );
    })
    // Log errors
    .on("error", console.error)
    // Log the bot in
    .login(config.discord.token);

  // Sets up watches/alerts for each guild.
  // @TODO: return a Promise
  function initGuild(guild, config, cb) {
    let guildConfig = config.discord.guilds[guild.id];

    if (!guildConfig) {
      cb(
        new Error(
          `No guild config found for guild ID ${guild.id} (${guild.name})!`
        ),
        false
      );
    }

    // Find the text channel(s) where we'll be posting alerts
    let alertsChannel = guild.channels.find(
      (x) => x.name === guildConfig.alertsChannelName
    );
    if (guildConfig.alertOnConnect === true)
      alertsChannel.send(config.botName + " has connected. :white_check_mark:");

    // Watch + alert for Twitch streams
    if (alertsChannel && guildConfig.enableLivestreamAlerts) {
      let embed = new Discord.RichEmbed();

      runnerWatcher
        .on("live", (stream) => {
          embed
            .setStreamAlertDefaults(stream)
            .setTitle(
              `Now live at twitch.tv/${stream.user_name.toLowerCase()} !`
            )
            .setColor("#339e31")
            .setImage(
              `${stream.thumbnail_url
                .replace("{width}", "640")
                .replace("{height}", "360")}`
            );
          alertsChannel.send({ embed });
        })
        .on("title", (stream) => {
          embed
            .setStreamAlertDefaults(stream)
            .setTitle(`Changed title:`)
            .setColor("#dedede")
            .setImage(null);
          alertsChannel.send({ embed });
        })
        .watch();
    }

    // Watch + alert for SRL races
    if (alertsChannel && guildConfig.enableRaceAlerts) {
      let embed = new Discord.RichEmbed();
      raceWatcher
        .on("init", (raceChannel, srlUrl) => {
          embed
            .setRaceAlertDefaults(raceChannel, srlUrl)
            .setDescription(
              `A race was just started for *${config.srl.gameName}*!`
            );
          alertsChannel.send({ embed });
        })
        .on("goal", (raceChannel, goal, srlUrl) => {
          embed
            .setRaceAlertDefaults(raceChannel, srlUrl)
            .setDescription(`Goal was set to: **${goal}**`);
          alertsChannel.send({ embed });
        })
        .on("done", (raceChannel, goal, srlUrl) => {
          embed
            .setRaceAlertDefaults(raceChannel, srlUrl)
            .setDescription("Race finished!");
          alertsChannel.send({ embed });
        })
        .on("rematch", (raceChannel, goal, srlUrl) => {
          embed
            .setRaceAlertDefaults(raceChannel, srlUrl)
            .setDescription("Rematch initiated!");
          alertsChannel.send({ embed });
        })
        .on("error", console.error)
        .watch();
    }

    // Schedule timers for some special messages / commands
    //
    // Weekly NMG Race Alert: Every Sunday at 11 AM Pacific /
    if (alertsChannel && guildConfig.enableWeeklyRaceAlert) {
      let timeToSchedule = { dayOfWeek: 0, hour: 11, minute: 0 };
      let weeklyRaceAlertRole = guild.roles.find(
        (x) => x.name === guildConfig.weeklyRaceAlertRole
      );
      schedule.scheduleJob(timeToSchedule, () => {
        console.log(
          `Sending weekly alert at ${moment().format(
            "MMMM Do YYYY, h:mm:ss a"
          )} to ${guild.name}`
        );
        let randomEmoji = guild.emojis.random();
        // @TODO: Move this message to config
        alertsChannel.send([
          weeklyRaceAlertRole,
          `The weekly Any% NMG Race is starting in 1 Hour on <https://racetime.gg> ${randomEmoji} Create an account (or log in) here: <https://racetime.gg/account/auth> | ALttP races can be found here: <https://racetime.gg/alttp>`,
        ]);
      });
    }

    cb(null, true);
  }
};

function dmUserFromMsg(originalMessage, newMessage) {
  // check that this isn't already a DM before sending
  if (originalMessage.channel.type === "dm") {
    originalMessage.channel.send(newMessage);
  } else {
    dmUser(originalMessage.member, newMessage);
  }
}

function dmUser(user, message) {
  user
    .createDM()
    .then((channel) => {
      channel.send(message);
    })
    .catch(console.error);
}

Discord.RichEmbed.prototype.setStreamAlertDefaults = function (stream) {
  return this.setAuthor(stream.user_name, stream.user.profile_image_url)
    .setURL(`https://twitch.tv/${stream.user_name.toLowerCase()}`)
    .setDescription(stream.title)
    .setTimestamp();
};

// @TODO Move this hardcoded thumbnail URL to config
Discord.RichEmbed.prototype.setRaceAlertDefaults = function (
  raceChannel,
  srlUrl
) {
  return this.setTitle(`SRL Race #${raceChannel}`)
    .setURL(srlUrl)
    .setThumbnail("http://i.imgur.com/8nqgDcI.png")
    .setColor("#f8e47f")
    .setFooter(`#${raceChannel}`)
    .setTimestamp();
};

Discord.Client.prototype.setRandomActivity = function () {
  if (!config.discord.master) return;
  let activity =
    config.discord.activities[
      Math.floor(Math.random() * config.discord.activities.length)
    ];
  console.log(`Setting Discord activity to: ${activity}`);
  this.user.setActivity(activity, {
    url: `https://twitch.tv/${config.twitch.username}`,
    type: "STREAMING",
  });
};

// catch Promise errors
process.on("unhandledRejection", console.error);
