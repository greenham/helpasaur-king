/**
 * ALttP Twitch Bot
 */

// Import modules
const irc = require("irc"),
  staticCommands = require("./lib/commands.js"),
  Cooldowns = require("cooldowns"),
  db = require("./db.js");

// Read internal configuration
let config = require("./config.json");
const cooldowns = new Cooldowns("helpa-twitch");

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
  let botChannel = "#" + config.twitch.username.toLowerCase();
  config.twitch.channels.push(botChannel);

  // Connect to Twitch IRC server
  let client = new irc.Client(config.twitch.ircServer, config.twitch.username, {
    password: config.twitch.oauth,
    autoRejoin: true,
    retryCount: 10,
    debug: config.debug,
  });

  client.addListener("error", (message) => {
    if (message.command != "err_unknowncommand") {
      console.error("error from Twitch IRC Server: ", message);
    }
  });

  client.addListener("message", (from, to, message) => {
    // Ignore everything from blacklisted users
    if (config.twitch.blacklistedUsers.includes(from)) return;

    // Listen for commands that start with the designated prefix
    if (message.startsWith(config.twitch.cmdPrefix)) {
      let commandParts = message
        .slice(config.twitch.cmdPrefix.length)
        .split(" ");
      let commandNoPrefix = commandParts[0] || "";

      // Listen for specific commands in the bot's channel
      if (to === botChannel) {
        if (commandNoPrefix === "join") {
          // join the requesting user's channel by default
          let userChannel = "#" + from;
          // check for channel argument if this user is an 'admin'
          if (
            commandParts[1] &&
            (config.twitch.admins.includes(from) ||
              from === config.twitch.username.toLowerCase())
          ) {
            // join this channel instead
            userChannel = "#" + commandParts[1];
          }
          console.log(`Received request from ${from} to join ${userChannel}`);
          let channelIndex = config.twitch.channels.indexOf(userChannel);
          if (channelIndex === -1) {
            client.say(
              to,
              `@${from} >> Joining ${userChannel}... please mod ${config.twitch.username} to avoid accidental timeouts or bans!`
            );

            // update config so this channel gets joined upon restart
            db.get()
              .collection("config")
              .update(
                { default: true },
                { $push: { "twitch.channels": userChannel } },
                (err, res) => {
                  if (err) {
                    console.error(
                      `Error adding twitch channel to bot list: ${err}`
                    );
                  } else {
                    console.log(
                      `Added ${userChannel} to twitch bot channel list`
                    );
                  }
                }
              );

            return client.join(userChannel);
          } else {
            return client.say(
              to,
              "@" + from + " >> I am already in your channel!"
            );
          }
        } else if (commandNoPrefix === "leave") {
          // leave the requesting user's channel by default
          let userChannel = "#" + from;
          // check for channel argument if this user is an 'admin'
          if (
            commandParts[1] &&
            (config.twitch.admins.includes(from) ||
              from === config.twitch.username.toLowerCase())
          ) {
            // join this channel instead
            userChannel = "#" + commandParts[1];
          }
          console.log(`Received request to leave ${userChannel}`);
          let channelIndex = config.twitch.channels.indexOf(userChannel);
          if (channelIndex !== -1) {
            client.say(
              to,
              `@${from} >> Leaving ${userChannel}... use ${config.twitch.cmdPrefix}join in this channel to re-join at any time!`
            );

            // update config so this channel no longer gets joined upon restart
            db.get()
              .collection("config")
              .update(
                { default: true },
                { $pull: { "twitch.channels": userChannel } },
                (err, res) => {
                  if (err) {
                    console.error(
                      `Error removing twitch channel from bot list: ${err}`
                    );
                  } else {
                    console.log(
                      `Removed ${userChannel} from twitch bot channel list`
                    );
                  }
                }
              );

            return client.part(
              userChannel,
              "Okay, bye! Have a beautiful time!"
            );
          } else {
            return client.say(to, "@" + from + " >> I am not in your channel!");
          }
        } else if (commandNoPrefix === "status") {
          const userChannel = "#" + from;
          let channelIndex = config.twitch.channels.indexOf(userChannel);
          if (channelIndex !== -1) {
            return client.say(to, "@" + from + " >> I am in your channel!");
          } else {
            return client.say(to, "@" + from + " >> I am not in your channel!");
          }
        } else if (commandNoPrefix === "reboot") {
          if (
            config.twitch.admins.includes(from) ||
            from === config.twitch.username.toLowerCase()
          ) {
            console.log("Received request from admin to reboot...");
            client.say(to, "Rebooting...");
            process.exit(0);
          }
        }
      }

      // Make sure this command isn't on cooldown
      let cooldownIndex = to + message;
      cooldowns
        .isOnCooldown(cooldownIndex, config.twitch.textCmdCooldown)
        .then((onCooldown) => {
          if (onCooldown === false) {
            staticCommands
              .get(commandNoPrefix)
              .then((command) => {
                if (command && command.response) {
                  console.log(
                    `received command in ${to} from ${from}: ${message}`
                  );
                  client.say(to, command.response);
                  cooldowns.placeOnCooldown(
                    cooldownIndex,
                    config.twitch.textCmdCooldown
                  );
                }
              })
              .catch(console.error);
          } else {
            // command is on cooldown in this channel
            console.log(`${message} is on cooldown in ${to} (sent by ${from})`);
          }
        })
        .catch(console.error);
    }
  });

  client.addListener("registered", async (message) => {
    console.log(`Connected to ${message.server}`);

    // Join channels in chunks of 20 every 10 seconds to get around Twitch limits
    for (i = 0; i < config.twitch.channels.length; i += 20) {
      // wait for 10 seconds
      await sleep(10000);
      // join next 20
      let chunkedList = config.twitch.channels.slice(i, i + 20);
      chunkedList.forEach((channelName) => {
        client.join(channelName);
      });
    }
  });

  client.addListener("join", (channel, nick, message) => {
    if (nick === config.twitch.username) {
      console.log(`Joined channel ${channel}`);
    }
  });

  client.addListener("part", (channel, nick, message) => {
    if (nick === config.twitch.username) {
      console.log(`Left channel ${channel}`);
    }
  });

  client.addListener("motd", (motd) => {
    console.log(`Received MOTD: ${motd}`);
  });
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// catches Promise errors
process.on("unhandledRejection", console.error);
