const tmi = require("tmi.js");
const axios = require("axios");
// @TODO: set this in docker-compose environment
const API_URL = "http://localhost:3000/api";

// @TODO: Get config from API

const client = new tmi.Client({
  options: { debug: true },
  identity: {
    username: "greenham",
    password: "oauth:113rcpasj0swdeu0759b6at890f359",
  },
  channels: ["helpasaurking"],
});

client.connect();

client.on("message", async (channel, tags, message, self) => {
  if (self || !message.startsWith("!")) return;

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
