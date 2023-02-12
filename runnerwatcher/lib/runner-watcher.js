const EventEmitter = require("events");
const TwitchEventListener = require("./twitch-event-listener");
const TwitchApi = require("node-twitch").default;

const { TWITCH_WEBHOOK_LISTENER_PORT } = process.env;
const {
  STREAM_ONLINE_EVENT,
  CHANNEL_UPDATE_EVENT,
  STREAM_ONLINE_TYPE_LIVE,
} = require("../constants");

// Maintain a cache of streams we've alerted
let streams = [];

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

      console.log("\r\n-------------------------------------\r\n");
      console.log(`Received ${eventType} event for ${user.login}`);
      console.log(event);

      try {
        // Pull stream info from Twitch API
        let streamResult = await this.twitchApi.getStreams({
          channel: user.id,
        });

        // Make sure there's actually a stream
        if (!streamResult || !streamResult.data || !streamResult.data[0]) {
          console.log(
            `No streams found for ${user.login}! They are either offline or the stream isn't available via the API yet.`
          );

          if (eventType === STREAM_ONLINE_EVENT) {
            // @TODO: Build in retry (or a delay?) here as sometimes the stream
            // online event gets fired ahead of the stream actually being available via the API
          }

          return;
        }

        let stream = streamResult.data[0];

        // Replace some stream data from API if this is an update event
        if (eventType === CHANNEL_UPDATE_EVENT) {
          stream.game_id = event.category_id;
          stream.title = event.title;
        }

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

        // If this is a channel update, ensure the title or game changed
        if (eventType === CHANNEL_UPDATE_EVENT) {
          // Find a stream with this ID in the cache
          let cachedStream = streams.find((s) => s.id === stream.id);
          if (
            cachedStream &&
            cachedStream.title == event.title &&
            cachedStream.game_id == event.category_id
          ) {
            console.log(`Title or game has not changed, skipping...`);
            return;
          }
        }

        // Pull user info
        let userResult = await this.twitchApi.getUsers(user.id);
        if (!userResult || !userResult.data || !userResult.data[0]) {
          console.log(`Unable to get data for user ${user.name}!`);
        } else {
          stream.user = userResult.data[0];
        }

        // Let the people know!
        stream.eventType = eventType;
        this.emit("streamEvent", stream);

        // Remove any cached stream data for this user
        streams = streams.filter((s) => s.user.id == stream.user.id);

        // Cache it
        streams.push(stream);
      } catch (err) {
        console.error(err);
      }
    });
  }
}

module.exports = RunnerWatcher;
