const { io } = require("socket.io-client");
const tmi = require("tmi.js");
const crypto = require("crypto");
const packageJson = require("../package.json");
const { WEBSOCKET_RELAY_SERVER } = process.env;

class TwitchBot {
  constructor(config, helpaApi) {
    this.config = config;
    this.helpaApi = helpaApi;
    this.cooldowns = new Map();
    this.cachedCommands = new Map();
    this.bot = null;
    this.wsRelay = null;
    // @TODO: Replace HelpasaurKing with this.config.botDisplayName
    this.messages = {
      onJoin: `👋 Hello, I'm HelpasaurKing and I'm very high in potassium... like a banana! 🍌 Commands: https://helpasaur.com/commands | Manage: https://helpasaur.com/twitch`,
      onLeave: `😭 Ok, goodbye forever. (jk, have me re-join anytime through https://helpasaur.com/twitch or my twitch chat using ${this.config.cmdPrefix}join)`,
    };
    this.lastRandomRoomMap = new Map();
  }

  // {
  //    roomId: u.twitchUserData.id,
  //    channelName: u.twitchUserData.login,
  //    displayName: u.twitchUserData.display_name,
  //    active: true,
  //    commandPrefix: '!',
  //    textCommandCooldown: 10,
  //    practiceListsEnabled: true,
  //    allowModsToManagePracticeLists: true,
  //    createdAt: ISODate('2024-01-21T22:47:24.975Z'),
  //    lastUpdated: ISODate('2024-01-21T22:47:24.975Z')
  // }
  start(channels) {
    this.setActiveChannels(channels);
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

    // Update active channels list every minute so we pick up config changes quickly
    setInterval(() => {
      this.refreshActiveChannels();
    }, 60000);
  }

  async handleMessage(channel, tags, message, self) {
    if (self) return;

    // Handle commands in the bot's channel (using the global default command prefix)
    // - join, leave
    if (channel === `#${this.config.username}`) {
      if (!message.startsWith(this.config.cmdPrefix)) return;
      const args = message.slice(1).split(" ");
      const commandNoPrefix = args.shift().toLowerCase();
      switch (commandNoPrefix) {
        case "join":
          let channelToJoin = tags.username;

          if (args[0] && tags.mod) {
            channelToJoin = args[0].toLowerCase();
          }

          console.log(
            `Received request from ${tags.username} to join ${channelToJoin}`
          );

          if (this.channelList.includes(channelToJoin)) {
            return this.bot
              .say(
                channel,
                `@${tags["display-name"]} >> I am already in ${channelToJoin}!`
              )
              .catch(console.error);
          }

          this.bot
            .say(
              channel,
              `@${tags["display-name"]} >> Joining ${channelToJoin}... please mod ${this.config.username} to avoid accidental timeouts or bans!`
            )
            .catch(console.error);

          this.bot.join(channelToJoin);
          this.channelList.push(channelToJoin);

          try {
            const result = await this.helpaApi.api.post(`/api/twitch/join`, {
              channel: channelToJoin,
            });

            if (result.data.result === "success") {
              // update the local map with the new channel config
              this.channelMap.set(
                result.data.twitchBotConfig.roomId,
                result.data.twitchBotConfig
              );
            }

            console.log(
              `Result of /api/twitch/join: ${JSON.stringify(result.data)}`
            );
          } catch (err) {
            console.error(`Error calling /api/twitch/join: ${err.message}`);
          }
          break;

        case "leave":
          let channelToLeave = tags.username;

          if (args[0] && tags.mod) {
            channelToLeave = args[0].toLowerCase();
          }

          console.log(
            `Received request from ${tags.username} to leave ${channelToLeave}`
          );

          if (!this.channelList.includes(channelToLeave)) {
            return this.bot
              .say(
                channel,
                `@${tags["display-name"]} >> I am not in ${channelToLeave}!`
              )
              .catch(console.error);
          }

          this.bot
            .say(
              channel,
              `@${tags["display-name"]} >> Leaving ${channelToLeave}... use ${this.config.cmdPrefix}join in this channel to re-join at any time!`
            )
            .catch(console.error);

          this.bot.part(channelToLeave);

          this.channelList = this.channelList.filter(
            (c) => c !== channelToLeave
          );
          this.channelMap.delete(tags["room-id"]);

          try {
            const result = await this.helpaApi.api.post(`/api/twitch/leave`, {
              channel: channelToLeave,
            });

            console.log(
              `Result of /api/twitch/leave: ${JSON.stringify(result.data)}`
            );
          } catch (err) {
            console.error(`Error calling /api/twitch/leave: ${err.message}`);
          }
          break;
      }

      return;
    }

    // Look up the config for this channel in the local cache
    const channelConfig = this.channelMap.get(tags["room-id"]);
    if (!channelConfig) return;

    if (!message.startsWith(channelConfig.commandPrefix)) return;

    if (this.config.blacklistedUsers.includes(tags.username)) {
      console.log(
        `Received command from blacklisted user ${tags.username} (${tags["user-id"]}) in ${channel}`
      );
      return;
    }

    const args = message.slice(1).split(" ");
    const commandNoPrefix = args.shift().toLowerCase();

    // Handle practice list commands if they're enabled for this channel
    // - By default, only the broadcaster can use these commands
    // - But mods can optionally be allowed to use them if configured
    // - Commands will only apply to the channel in which they are issued
    if (
      channelConfig.practiceListsEnabled &&
      (channelConfig.roomId === tags["user-id"] ||
        (channelConfig.allowModsToManagePracticeLists && tags.mod === true))
    ) {
      const targetUser = tags["room-id"];
      const listName = "default";

      switch (commandNoPrefix) {
        case "pracadd":
          if (args.length === 0) {
            this.bot
              .say(
                channel,
                `@${tags["display-name"]} >> You must specify an entry name! e.g. ${channelConfig.commandPrefix}pracadd gtower mimics`
              )
              .catch(console.error);
            return;
          }

          const entryName = args.join(" ");
          console.log(
            `[${channel}] ${tags["display-name"]} used ${commandNoPrefix} with entry: ${entryName}`
          );

          try {
            const response = await this.helpaApi.api.post(
              `/api/prac/${targetUser}/lists/${listName}/entries`,
              {
                entry: entryName,
              }
            );
            console.log(response.data.message);
            this.bot.say(channel, response.data.message).catch(console.error);
            return;
          } catch (err) {
            this.handleApiError(
              err,
              "Error adding entry to practice list",
              channel,
              tags
            );
            return;
          }
        case "pracrand":
          console.log(
            `[${channel}] ${tags["display-name"]} used ${commandNoPrefix}`
          );

          try {
            // get their list
            const response = await this.helpaApi.api(
              `/api/prac/${targetUser}/lists/${listName}`
            );
            const entries = response.data.entries;

            // choose a random entry
            let randomIndex = Math.floor(Math.random() * entries.length);
            let randomEntry = entries[randomIndex];

            // if they have more than 2 entries, make sure we don't get the same one twice in a row
            if (entries.length > 2) {
              let lastRandomEntry = this.lastRandomRoomMap.get(channel);
              while (
                crypto.createHash("md5").update(randomEntry).digest("hex") ===
                lastRandomEntry
              ) {
                randomIndex = Math.floor(Math.random() * entries.length);
                randomEntry = entries[randomIndex];
              }
            }

            this.bot
              .say(
                channel,
                `Practice this: ${randomEntry} [${randomIndex + 1}]`
              )
              .catch(console.error);

            // remember the last random entry we gave them
            this.lastRandomRoomMap.set(
              channel,
              crypto.createHash("md5").update(randomEntry).digest("hex")
            );
            return;
          } catch (err) {
            this.handleApiError(
              err,
              "Error fetching random entry from practice list",
              channel,
              tags,
              {
                404: `No entries found in practice list! Add one using ${channelConfig.commandPrefix}pracadd <entry name>`,
              }
            );
            return;
          }
        case "pracdel":
          const entryId = parseInt(args[0]);
          console.log(
            `[${channel}] ${tags["display-name"]} used ${commandNoPrefix} with entry ID: ${entryId}`
          );
          try {
            const response = await this.helpaApi.api.delete(
              `/api/prac/${targetUser}/lists/${listName}/entries/${entryId}`
            );
            console.log(response.data.message);
            this.bot.say(channel, response.data.message).catch(console.error);
            return;
          } catch (err) {
            this.handleApiError(
              err,
              `Error removing entry #${entryId} from practice list`,
              channel,
              tags
            );
            return;
          }
        case "praclist":
          console.log(
            `[${channel}] ${tags["display-name"]} used ${commandNoPrefix}`
          );
          try {
            const response = await this.helpaApi.api(
              `/api/prac/${targetUser}/lists/${listName}`
            );
            this.bot
              .say(
                channel,
                response.data.entries
                  .map((e, idx) => `[${idx + 1}] ${e}`)
                  .join(" | ")
              )
              .catch(console.error);
            return;
          } catch (err) {
            this.handleApiError(
              err,
              "Error fetching practice list",
              channel,
              tags,
              {
                404: `No entries found in practice list! Add one using ${channelConfig.commandPrefix}pracadd <entry name>`,
              }
            );
            return;
          }
        case "pracclear":
          if (targetUser !== tags["user-id"]) {
            this.bot
              .say(
                channel,
                `@${tags["display-name"]} >> Only the broadcaster can clear their practice list!`
              )
              .catch(console.error);
            return;
          }

          console.log(
            `[${channel}] ${tags["display-name"]} used ${commandNoPrefix}`
          );

          try {
            const response = await this.helpaApi.api.delete(
              `/api/prac/${targetUser}/lists/${listName}`
            );
            this.bot.say(channel, response.data.message).catch(console.error);
            return;
          } catch (err) {
            this.handleApiError(
              err,
              "Error clearing practice list",
              channel,
              tags,
              {
                404: `Nothing to clear!`,
              }
            );
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
      if (now - timeUsed <= channelConfig.textCommandCooldown * 1000) {
        onCooldown =
          (channelConfig.textCommandCooldown * 1000 - (now - timeUsed)) / 1000;
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

  handleJoinChannel({ payload }) {
    const { channel } = payload;
    console.log(`Received joinChannel event for: ${channel}`);
    if (this.channelList.includes(channel)) {
      console.log(`Already in #${channel}`);
      return;
    }

    this.bot.join(channel).catch(console.error);
    this.bot.say(channel, this.messages.onJoin).catch(console.error);

    // update local configs
    this.refreshActiveChannels();

    console.log(`Joined #${channel}`);
  }

  handleLeaveChannel({ payload: channel }) {
    console.log(`Received leaveChannel event for ${channel}`);
    if (!this.channelList.includes(channel)) {
      console.log(`Not in #${channel}`);
      return;
    }

    // say our goodbyes o/
    this.bot.say(channel, this.messages.onLeave).catch(console.error);
    this.bot.part(channel).catch(console.error);

    // update local configs
    this.refreshActiveChannels();

    console.log(`Left #${channel}`);
  }

  handleApiError(err, errorMessageBase, channel, tags, statusErrors = null) {
    console.error(errorMessageBase);
    if (err.response) {
      console.error(
        `${err.response.status} Error: ${err.response.data.message}`
      );

      if (statusErrors && statusErrors[err.response.status]) {
        this.bot
          .say(
            channel,
            `@${tags["display-name"]} >> ${statusErrors[err.response.status]}`
          )
          .catch(console.error);
      } else {
        this.bot
          .say(
            channel,
            `@${tags["display-name"]} >> ${err.response.status} ${errorMessageBase}: ${err.response.data.message}`
          )
          .catch(console.error);
      }
    } else if (err.request) {
      console.error("No response received from API!");
      this.bot
        .say(
          channel,
          `@${tags["display-name"]} >> ${errorMessageBase}: Helpa might be asleep. ResidentSleeper`
        )
        .catch(console.error);
    } else {
      console.error(`Error during request setup: ${err.message}`);
      this.bot
        .say(
          channel,
          `@${tags["display-name"]} >> ${errorMessageBase}: ${err.message}`
        )
        .catch(console.error);
    }
  }

  refreshActiveChannels() {
    this.helpaApi
      .api("/api/configs/twitch/activeChannels")
      .then((response) => {
        if (!response) {
          throw new Error(`Unable to refresh active channel list from API!`);
        }

        this.setActiveChannels(response.data);
      })
      .catch((error) => {
        console.error("🛑 Error refreshing active channel list:", error);
      });
  }

  setActiveChannels(channels) {
    this.channelList = [
      this.config.username,
      ...channels.map((c) => c.channelName),
    ];
    this.channelMap = new Map();
    // map roomId => config
    channels.forEach((c) => {
      this.channelMap.set(c.roomId, c);
    });
  }
}

exports.TwitchBot = TwitchBot;
