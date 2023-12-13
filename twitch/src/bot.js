const { io } = require("socket.io-client");
const tmi = require("tmi.js");
const packageJson = require("../package.json");
const { WEBSOCKET_RELAY_SERVER } = process.env;

class TwitchBot {
  constructor(config, helpaApi) {
    this.config = config;
    this.helpaApi = helpaApi;
    this.cooldowns = new Map();
    this.cachedCommands = new Map();
    this.channelList = [this.config.username, ...this.config.channels];
    this.bot = null;
    this.wsRelay = null;
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

    this.bot.connect();

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

    this.bot.say(channel, command.response);

    this.cooldowns.set(cooldownKey, Date.now());

    let aliasUsed = "";
    if (
      command.aliases &&
      command.aliases.length > 0 &&
      command.aliases.includes(commandNoPrefix)
    ) {
      aliasUsed = commandNoPrefix;
    }

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
  }

  handleJoinChannel({ payload: channel }) {
    console.log(`Received joinChannel event for: ${channel}`);
    if (this.channelList.includes(channel)) {
      console.log(`Already in #${channel}`);
      return;
    }

    this.bot.join(channel);
    this.bot.say(
      channel,
      `Hello, I'm Helpasaur King and I'm very high in potassium... like a banana! Use ${this.config.cmdPrefix}help to see what I can do.`
    );
    this.channelList.push(channel);
    console.log(`Joined #${channel}`);
  }

  handleLeaveChannel({ payload: channel }) {
    console.log(`Received leaveChannel event for ${channel}`);
    if (!this.channelList.includes(channel)) {
      console.log(`Not in #${channel}`);
      return;
    }

    this.bot.say(
      channel,
      `😭 Ok, goodbye forever. (jk, have me re-join anytime through https://helpasaur.com or my twitch chat using ${this.config.cmdPrefix}join)`
    );
    this.bot.part(channel);
    this.channelList = this.channelList.filter((c) => c !== channel);
    console.log(`Left #${channel}`);
  }
}
exports.TwitchBot = TwitchBot;
