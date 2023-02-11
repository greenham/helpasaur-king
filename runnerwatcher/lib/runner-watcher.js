const EventEmitter = require("events");
const TwitchEventListener = require("./twitch-event-listener");
const TwitchApi = require("node-twitch").default;

const { TWITCH_WEBHOOK_LISTENER_PORT } = process.env;
const {
  STREAM_ONLINE_EVENT,
  CHANNEL_UPDATE_EVENT,
  STREAM_ONLINE_TYPE_LIVE,
} = require("../constants");

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

    this.listener.on("notification", async (notification) => {
      const { subscription, event } = notification;
      const eventType = subscription.type;
      const user = {
        id: event.broadcaster_user_id,
        login: event.broadcaster_user_login,
        name: event.broadcaster_user_name,
      };

      console.log(`Received ${eventType} event for ${user.login}`);
      console.log(event);

      try {
        // Pull stream info from Twitch API
        let streamResult = await this.twitchApi.getStreams({
          channel: user.id,
        });

        // Make sure there's actually a stream
        if (!streamResult || !streamResult.data || !streamResult.data[0]) {
          console.log(`No streams found for ${user.login} (${user.id})`);

          if (eventType === STREAM_ONLINE_EVENT) {
            // @TODO: Build in retry (or a delay?) here as sometimes the stream
            // online event gets fired ahead of the stream actually being available via the API
          }

          return;
        }

        let stream = streamResult.data[0];

        // Make sure the stream is actually live
        // (we don't care about playlist, watch_party, premiere, rerun)
        if (stream.type !== STREAM_ONLINE_TYPE_LIVE) {
          console.log(`Stream is not live, skipping...`);
          return;
        }

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
        stream.eventType = eventType;
        this.emit("streamEvent", stream);
      } catch (err) {
        console.error(err);
      }
    });
  }
}

module.exports = RunnerWatcher;
