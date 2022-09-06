const tmi = require("tmi.js");
const axios = require("axios");
const { API_URL } = process.env;

// Fetch config via API
axios
  .get(`${API_URL}/configs/twitch`)
  .then((result) => {
    init(result.data.config);
  })
  .catch((err) => {
    console.error(`Error fetching config: ${err.message}`);
  });

function init(config) {
  // const channelList = config.channels.map((c) => c.slice(1).split(" ")[0]);

  const client = new tmi.Client({
    options: { debug: true },
    identity: {
      username: config.username,
      password: config.oauth,
    },
    channels: ["helpasaurking"],
  });

  client.connect();

  client.on("message", async (channel, tags, message, self) => {
    if (self || !message.startsWith(config.cmdPrefix)) return;

    const args = message.slice(1).split(" ");
    const commandNoPrefix = args.shift().toLowerCase();

    // @TODO: Handle join/part requests from helpa's channel

    // Try to find the command in the database
    // @TODO: Cache the full list of commands and refresh every 10 minutes or so
    try {
      const response = await axios.post(`${API_URL}/commands/find`, {
        command: commandNoPrefix,
      });

      if (response.status === 200) {
        command = response.data;
      }
    } catch (err) {
      console.error(`Error while fetching command: ${err}`);
      return;
    }

    client.say(channel, command.response);

    // @TODO: Call the API to increment use count for this command
  });
}
