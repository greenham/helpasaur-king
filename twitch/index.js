const tmi = require("tmi.js");
const axios = require("axios");
const { API_URL } = process.env;
let cooldowns = new Map();
let cachedCommands = new Map();

// Fetch config via API
axios
  .get(`${API_URL}/configs/twitch`)
  .then((result) => {
    init(result.data.config);
  })
  .catch((err) => {
    console.error(`Error fetching config: ${err.message}`);
    // @TODO: build in retry
  });

function init(config) {
  const {
    username,
    oauth: password,
    cmdPrefix,
    textCmdCooldown,
    blacklistedUsers,
    channels: channelsToJoin,
  } = config;

  let channelList = [username, ...channelsToJoin];

  const client = new tmi.Client({
    options: { debug: false },
    identity: { username, password },
    // channels: [username],
    channels: [...channelList],
  });

  client.connect();

  client.on("message", async (channel, tags, message, self) => {
    if (self || !message.startsWith(cmdPrefix)) return;

    // {
    //   "badge-info": null,
    //   "badges": { "moderator": "1" },
    //   "color": "#BADA55",
    //   "display-name": "greenHam",
    //   "emotes": null,
    //   "first-msg": false,
    //   "flags": null,
    //   "id": "fe08874b-daa5-4d5c-a572-a113effa306f",
    //   "mod": true,
    //   "returning-chatter": false,
    //   "room-id": "164641928",
    //   "subscriber": false,
    //   "tmi-sent-ts": "1662956626462",
    //   "turbo": false,
    //   "user-id": "78410627",
    //   "user-type": "mod",
    //   "emotes-raw": null,
    //   "badge-info-raw": null,
    //   "badges-raw": "moderator/1",
    //   "username": "greenham",
    //   "message-type": "chat"
    // }

    // Ignore everything from blacklisted users
    if (blacklistedUsers.includes(tags.username)) {
      console.log(
        `Received command from blacklisted user: ${tags.username} (${tags["user-id"]})`
      );
      return;
    }

    const args = message.slice(1).split(" ");
    const commandNoPrefix = args.shift().toLowerCase();

    // Handle join/part requests from the bot's channel
    if (channel === `#${username}`) {
      if (commandNoPrefix === "join") {
        // join the requesting user's channel by default
        let userChannel = tags.username;

        // check for channel argument if this user is a mod
        if (args[0] && tags.mod) {
          // join the specified channel instead
          userChannel = args[0].toLowerCase();
        }

        console.log(
          `Received request from ${tags.username} to join ${userChannel}`
        );

        if (channelList.includes(userChannel)) {
          return client.say(
            channel,
            `@${tags["display-name"]} >> I am already in ${userChannel}!`
          );
        }

        client.say(
          channel,
          `@${tags["display-name"]} >> Joining ${userChannel}... please mod ${username} to avoid accidental timeouts or bans!`
        );

        // Attempt to join the channel
        client.join(userChannel);

        // Add to local list
        channelList.push(userChannel);

        // call API to add this channel to the list
        axios
          .post(`${API_URL}/twitch/join`, { channel: userChannel })
          .then((result) => {
            console.log(
              `Result of ${API_URL}/twitch/join: ${JSON.stringify(result.data)}`
            );
          })
          .catch((err) => {
            console.error(
              `Error calling ${API_URL}/twitch/join: ${err.message}`
            );
          });

        return;
      } else if (commandNoPrefix === "leave") {
        // leave the requesting user's channel by default
        let userChannel = tags.username;

        // check for channel argument if this user is a mod
        if (args[0] && tags.mod) {
          // leave the specified channel instead
          userChannel = args[0].toLowerCase();
        }

        console.log(
          `Received request from ${tags.username} to leave ${userChannel}`
        );

        if (!channelList.includes(userChannel)) {
          return client.say(
            channel,
            `@${tags["display-name"]} >> I am not in ${userChannel}!`
          );
        }

        client.say(
          channel,
          `@${tags["display-name"]} >> Leaving ${userChannel}... use ${cmdPrefix}join in this channel to re-join at any time!`
        );

        // Attempt to leave the channel
        client.part(userChannel);

        // Remove from local list
        channelList = channelList.filter((c) => c !== userChannel);

        // call API to remove this channel to the list
        axios
          .post(`${API_URL}/twitch/leave`, { channel: userChannel })
          .then((result) => {
            console.log(
              `Result of ${API_URL}/twitch/leave: ${JSON.stringify(
                result.data
              )}`
            );
          })
          .catch((err) => {
            console.error(
              `Error calling ${API_URL}/twitch/leave: ${err.message}`
            );
          });

        return;
      }
    }

    // Try to find the command in the database
    let command = false;

    // Try to find the command in the cache
    let cachedCommand = cachedCommands.get(commandNoPrefix);

    // If it's cached, make sure it's not too stale
    if (cachedCommand && Date.now() > cachedCommand.staleAfter) {
      cachedCommand = false;
    }

    if (!cachedCommand) {
      // Not cached, try to find the command in the database
      try {
        const response = await axios.post(`${API_URL}/commands/find`, {
          command: commandNoPrefix,
        });

        if (response.status === 200) {
          command = response.data;

          if (command) {
            // Cache it for 10 minutes
            command.staleAfter = Date.now() + 10 * 60 * 1000;
            cachedCommands.set(commandNoPrefix, command);
          }
        }
      } catch (err) {
        console.error(`Error while fetching command: ${err}`);
        return;
      }
    } else {
      // Use cached version
      command = cachedCommand;
    }

    if (!command) return;

    // Make sure command isn't on cooldown in this channel
    let onCooldown = false;
    let cooldownKey = command.command + channel;
    let timeUsed = cooldowns.get(cooldownKey);
    if (timeUsed) {
      let now = Date.now();
      // Command was recently used, check timestamp to see if it's on cooldown
      if (now - timeUsed <= textCmdCooldown * 1000) {
        // Calculate how much longer it's on cooldown
        onCooldown = (textCmdCooldown * 1000 - (now - timeUsed)) / 1000;
      }
    }

    if (onCooldown !== false) {
      // Command is on cooldown
      return;
    }

    if (command === false) {
      return;
    }

    client.say(channel, command.response);

    // Place command on cooldown
    cooldowns.set(cooldownKey, Date.now());

    // @TODO: Call the API to increment use count for this command
  });
}

process.on("unhandledRejection", (error) => {
  console.error("Unhandled promise rejection:", error);
});
