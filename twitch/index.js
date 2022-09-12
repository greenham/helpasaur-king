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
  // const channelList = config.channels.map((c) => c.slice(1).split(" ")[0]);
  const { username, oauth: password, cmdPrefix, textCmdCooldown } = config;

  const client = new tmi.Client({
    options: { debug: true },
    identity: { username, password },
    channels: ["helpasaurking"],
    // channels: channelList
  });

  client.connect();

  client.on("message", async (channel, tags, message, self) => {
    if (self || !message.startsWith(cmdPrefix)) return;

    const args = message.slice(1).split(" ");
    const commandNoPrefix = args.shift().toLowerCase();

    // @TODO: Handle join/part requests from helpa's channel

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

          // Cache it for 10 minutes
          command.staleAfter = Date.now() + 10 * 60 * 1000;
          cachedCommands.set(commandNoPrefix, command);
        }
      } catch (err) {
        console.error(`Error while fetching command: ${err}`);
        return;
      }
    } else {
      // Use cached version
      command = cachedCommand;
    }

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
