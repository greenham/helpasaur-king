const EventEmitter = require("events");
const TwitchEventListener = require("./twitch-event-listener");
const TwitchApi = require("node-twitch").default;

const { TWITCH_WEBHOOK_LISTENER_PORT } = process.env;
const { STREAM_ONLINE_EVENT, CHANNEL_UPDATE_EVENT } = require("../constants");

class RunnerWatcher extends EventEmitter {
  constructor(config) {
    super();

    this.config = config;

    if (!this.config.clientId || !this.config.clientSecret) {
      throw new Error(
        `Missing config parameter! clientId and clientSecret must be set.`
      );
    }

    this.twitchApi = new TwitchApi({
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
    });

    this.listener = new TwitchEventListener();

    this.init();
  }

  init() {
    this.listener.listen(TWITCH_WEBHOOK_LISTENER_PORT);

    this.listener.on(STREAM_ONLINE_EVENT, async (event) => {
      let user = {
        id: event.broadcaster_user_id,
        login: event.broadcaster_user_login,
        name: event.broadcaster_user_name,
      };

      console.log(`Received ${STREAM_ONLINE_EVENT} event for ${user.login}`);

      // Pull stream info from Twitch API
      // @TODO: Build in retry (or a delay?) here as sometimes this event gets fired ahead of the stream actually being available via the API
      try {
        let streamResult = await this.twitchApi.getStreams({
          channel: user.id,
        });

        if (!streamResult || !streamResult.data || !streamResult.data[0]) {
          throw new Error(`No streams found for ${user.login} (${user.id})`);
        }

        let stream = streamResult.data[0];

        // Ensure stream is alttp
        if (!this.config.alttpGameIds.includes(stream.game_id)) {
          console.log(`Not streaming configured game, skipping...`);
          return;
        }

        // And passes filters
        const speedrunTester = new RegExp(this.config.statusFilters, "i");
        if (speedrunTester.test(stream.title)) {
          console.log(`Stream title does not pass filters, skipping...`);
          return;
        }

        // Pull user info
        let userResult = await this.twitchApi.getUsers(user.id);
        if (!userResult || !userResult.data || !userResult.data[0]) {
          console.log(`Unable to get data for user ${user.name} (${user.id})`);
        } else {
          stream.user = userResult.data[0];
        }

        // Let the people know!
        stream.eventType = STREAM_ONLINE_EVENT;
        this.emit("streamEvent", stream);
      } catch (err) {
        console.error(err);
      }
    });

    this.listener.on(CHANNEL_UPDATE_EVENT, async (event) => {
      let user = {
        id: event.broadcaster_user_id,
        login: event.broadcaster_user_login,
        name: event.broadcaster_user_name,
      };

      console.log(`Received ${CHANNEL_UPDATE_EVENT} event for ${user.login}:`);

      // Ensure stream is alttp
      if (!this.config.alttpGameIds.includes(event.category_id)) {
        console.log(`Not streaming configured game, skipping...`);
        return;
      }

      // And passes filters
      const speedrunTester = new RegExp(this.config.statusFilters, "i");
      if (speedrunTester.test(event.title)) {
        console.log(`Stream title does not pass filters, skipping...`);
        return;
      }

      try {
        // Pull user info
        let userResult = await this.twitchApi.getUsers(user.id);
        let userData;
        if (!userResult || !userResult.data || !userResult.data[0]) {
          console.log(`Unable to get data for user ${user.name} (${user.id})`);
        } else {
          event.user = userResult.data[0];
        }

        // Let the people know!
        event.eventType = CHANNEL_UPDATE_EVENT;
        this.emit("streamEvent", event);
      } catch (err) {
        console.error(err);
      }
    });
  }
}

module.exports = RunnerWatcher;
