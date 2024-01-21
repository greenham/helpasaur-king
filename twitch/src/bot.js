const { io } = require("socket.io-client");
const tmi = require("tmi.js");
const packageJson = require("../package.json");
const { WEBSOCKET_RELAY_SERVER } = process.env;

class TwitchBot {
  PRACADD_COMMAND = "pracadd";

  constructor(config, helpaApi) {
    this.config = config;
    this.helpaApi = helpaApi;
    this.cooldowns = new Map();
    this.cachedCommands = new Map();
    this.channelList = [this.config.username, ...this.config.channels];
    this.bot = null;
    this.wsRelay = null;
    this.messages = {
      onJoin: `👋 Hello, I'm HelpasaurKing and I'm very high in potassium... like a banana! 🍌 Use ${this.config.cmdPrefix}helpa to see what I can do.`,
      onLeave: `😭 Ok, goodbye forever. (jk, have me re-join anytime through https://helpasaur.com/twitch or my twitch chat using ${this.config.cmdPrefix}join)`,
    };
  }

  start() {
    this.bot = new tmi.Client({
      options: { debug: false },
      identity: {
        username: this.config.username,
        password: this.config.oauth,
      },
      channels: [...this.channelList],
      skipMembership: true,
    });

    this.bot.connect().catch(console.error);

    this.bot.on("message", this.handleMessage.bind(this));

    this.wsRelay = io(WEBSOCKET_RELAY_SERVER, {
      query: { clientId: `${packageJson.name} v${packageJson.version}` },
    });

    console.log(
      `Connecting to websocket relay server on port ${WEBSOCKET_RELAY_SERVER}...`
    );

    this.wsRelay.on("connect_error", (err) => {
      console.log(`Connection error!`);
      console.log(err);
    });

    this.wsRelay.on("connect", () => {
      console.log(`✅ Connected! Socket ID: ${this.wsRelay.id}`);
    });

    this.wsRelay.on("joinChannel", this.handleJoinChannel.bind(this));
    this.wsRelay.on("leaveChannel", this.handleLeaveChannel.bind(this));
  }

  async handleMessage(channel, tags, message, self) {
    if (self || !message.startsWith(this.config.cmdPrefix)) return;

    if (this.config.blacklistedUsers.includes(tags.username)) {
      console.log(
        `Received command from blacklisted user: ${tags.username} (${tags["user-id"]})`
      );
      return;
    }

    const args = message.slice(1).split(" ");
    const commandNoPrefix = args.shift().toLowerCase();

    // Handle commands in the bot's channel
    // - join, leave
    if (channel === `#${this.config.username}`) {
      if (commandNoPrefix === "join") {
        let userChannel = tags.username;

        if (args[0] && tags.mod) {
          userChannel = args[0].toLowerCase();
        }

        console.log(
          `Received request from ${tags.username} to join ${userChannel}`
        );

        if (this.channelList.includes(userChannel)) {
          return this.bot.say(
            channel,
            `@${tags["display-name"]} >> I am already in ${userChannel}!`
          );
        }

        this.bot.say(
          channel,
          `@${tags["display-name"]} >> Joining ${userChannel}... please mod ${this.config.username} to avoid accidental timeouts or bans!`
        );

        this.bot.join(userChannel);

        this.channelList.push(userChannel);

        try {
          const result = await this.helpaApi.api.post(`/api/twitch/join`, {
            channel: userChannel,
          });

          console.log(
            `Result of /api/twitch/join: ${JSON.stringify(result.data)}`
          );
        } catch (err) {
          console.error(`Error calling /api/twitch/join: ${err.message}`);
        }

        return;
      } else if (commandNoPrefix === "leave") {
        let userChannel = tags.username;

        if (args[0] && tags.mod) {
          userChannel = args[0].toLowerCase();
        }

        console.log(
          `Received request from ${tags.username} to leave ${userChannel}`
        );

        if (!this.channelList.includes(userChannel)) {
          return this.bot.say(
            channel,
            `@${tags["display-name"]} >> I am not in ${userChannel}!`
          );
        }

        this.bot.say(
          channel,
          `@${tags["display-name"]} >> Leaving ${userChannel}... use ${this.config.cmdPrefix}join in this channel to re-join at any time!`
        );

        this.bot.part(userChannel);

        this.channelList = this.channelList.filter((c) => c !== userChannel);

        try {
          const result = await this.helpaApi.api.post(`/api/twitch/leave`, {
            channel: userChannel,
          });

          console.log(
            `Result of /api/twitch/leave: ${JSON.stringify(result.data)}`
          );
        } catch (err) {
          console.error(`Error calling /api/twitch/leave: ${err.message}`);
        }

        return;
      }
    }

    // Check here for prac commands and handle them
    // (Only handle these for the broadcaster for now)
    // @TODO: support moderators being able to use these commands if
    // the user has that enabled (tags.mod === true)
    if (channel === `#${tags.username}`) {
      switch (commandNoPrefix) {
        case "pracadd":
          if (args.length === 0) {
            this.bot
              .say(
                channel,
                `@${tags["display-name"]} >> You must specify an entry name! e.g. ${this.config.cmdPrefix}pracadd gtower mimics`
              )
              .catch(console.error);
            return;
          }
          const entryName = args.join(" ");
          try {
            // @TODO: replace username with tags["user-id"]
            const response = await this.helpaApi.api.post(
              `/api/prac/${tags.username}/lists/default/entries`,
              {
                entry: entryName,
              }
            );
            console.log(response.data.message);
            this.bot.say(channel, response.data.message).catch(console.error);
            return;
          } catch (err) {
            console.error(
              `Error adding entry to practice list: ${err.response.data.message}`
            );
            this.bot
              .say(
                channel,
                `@${tags["display-name"]} >> Error adding entry to practice list: ${err.response.data.message}`
              )
              .catch(console.error);
            return;
          }
        case "pracrand":
          try {
            // @TODO: replace username with tags["user-id"]
            const response = await this.helpaApi.api(
              `/api/prac/${tags.username}/lists/default/entries/random`
            );
            console.log(response.data.message);
            this.bot.say(channel, response.data.message).catch(console.error);
            return;
          } catch (err) {
            console.error(
              `Error fetching random entry from practice list: ${err.response.data.message}`
            );
            this.bot
              .say(
                channel,
                `@${tags["display-name"]} >> Error fetching random entry from practice list: ${err.response.data.message}`
              )
              .catch(console.error);
            return;
          }
        case "pracdel":
          const entryId = parseInt(args[0]);
          try {
            // @TODO: replace username with tags["user-id"]
            const response = await this.helpaApi.api.delete(
              `/api/prac/${tags.username}/lists/default/entries/${entryId}`
            );
            console.log(response.data.message);
            this.bot.say(channel, response.data.message).catch(console.error);
            return;
          } catch (err) {
            console.error(
              `Error removing entry #${entryId} from practice list: ${err.response.data.message}`
            );
            this.bot
              .say(
                channel,
                `@${tags["display-name"]} >> Error removing entry #${entryId} from practice list: ${err.response.data.message}`
              )
              .catch(console.error);
            return;
          }
        case "praclist":
          try {
            // @TODO: replace username with tags["user-id"]
            const response = await this.helpaApi.api(
              `/api/prac/${tags.username}/lists/default`
            );
            console.log(response.data.message);
            this.bot.say(channel, response.data.message).catch(console.error);
            return;
          } catch (err) {
            console.error(
              `Error fetching practice list: ${err.response.data.message}`
            );
            this.bot
              .say(
                channel,
                `Error fetching practice list: ${err.response.data.message}`
              )
              .catch(console.error);
            return;
          }
      }
    }

    let command = false;
    let cachedCommand = this.cachedCommands.get(commandNoPrefix);

    if (cachedCommand && Date.now() > cachedCommand.staleAfter) {
      cachedCommand = false;
    }

    console.log(`[${channel}] ${tags["display-name"]}: ${commandNoPrefix}`);

    if (!cachedCommand) {
      try {
        const response = await this.helpaApi.api.post(`/api/commands/find`, {
          command: commandNoPrefix,
        });

        if (response.status === 200) {
          command = response.data;

          if (command) {
            command.staleAfter = Date.now() + 10 * 60 * 1000;
            this.cachedCommands.set(commandNoPrefix, command);
          }
        }
      } catch (err) {
        console.error(`Error while fetching command: ${err}`);
        return;
      }
    } else {
      command = cachedCommand;
    }

    if (!command) return;

    let onCooldown = false;
    let cooldownKey = command.command + channel;
    let timeUsed = this.cooldowns.get(cooldownKey);
    if (timeUsed) {
      let now = Date.now();
      if (now - timeUsed <= this.config.textCmdCooldown * 1000) {
        onCooldown =
          (this.config.textCmdCooldown * 1000 - (now - timeUsed)) / 1000;
      }
    }

    if (onCooldown !== false) {
      return;
    }

    if (command === false) {
      return;
    }

    this.bot.say(channel, command.response).catch(console.error);

    this.cooldowns.set(cooldownKey, Date.now());

    let aliasUsed = "";
    if (
      command.aliases &&
      command.aliases.length > 0 &&
      command.aliases.includes(commandNoPrefix)
    ) {
      aliasUsed = commandNoPrefix;
    }

    try {
      await this.helpaApi.api.post(`/api/commands/logs`, {
        command: command.command,
        alias: aliasUsed,
        source: "twitch",
        username: tags.username,
        metadata: {
          channel,
          tags,
        },
      });
    } catch (err) {
      console.error(`Error while logging command: ${err}`);
    }
  }

  handleJoinChannel({ payload: channel }) {
    console.log(`Received joinChannel event for: ${channel}`);
    if (this.channelList.includes(channel)) {
      console.log(`Already in #${channel}`);
      return;
    }

    this.bot.join(channel).catch(console.error);
    this.bot.say(channel, this.messages.onJoin).catch(console.error);
    this.channelList.push(channel);
    console.log(`Joined #${channel}`);
  }

  handleLeaveChannel({ payload: channel }) {
    console.log(`Received leaveChannel event for ${channel}`);
    if (!this.channelList.includes(channel)) {
      console.log(`Not in #${channel}`);
      return;
    }

    this.bot.say(channel, this.messages.onLeave).catch(console.error);
    this.bot.part(channel).catch(console.error);
    this.channelList = this.channelList.filter((c) => c !== channel);
    console.log(`Left #${channel}`);
  }
}
exports.TwitchBot = TwitchBot;
