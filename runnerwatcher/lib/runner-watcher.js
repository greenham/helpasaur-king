const EventEmitter = require("events");
const TwitchEventListener = require("./twitch-event-listener");
const TwitchApi = require("node-twitch").default;

const { TWITCH_WEBHOOK_LISTENER_PORT } = process.env;
const {
  STREAM_ONLINE_EVENT,
  CHANNEL_UPDATE_EVENT,
  STREAM_ONLINE_TYPE_LIVE,
} = require("../constants");
const DELAY_FOR_API_SECONDS = 10;

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
      console.log("\r\n-------------------------------------\r\n");
      console.log(
        `Received ${notification.subscription.type} event for ${notification.event.broadcaster_user_login}`
      );
      console.log(notification.event);
      console.log(`Processing event in ${DELAY_FOR_API_SECONDS} seconds...`);

      // Waiting here to ensure fresh data is available via Twitch API
      setTimeout(() => {
        this.processEvent(notification);
      }, DELAY_FOR_API_SECONDS * 1000);
    });
  }

  async processEvent(notification) {
    const { subscription, event } = notification;
    let eventType = subscription.type;
    const user = {
      id: event.broadcaster_user_id,
      login: event.broadcaster_user_login,
      name: event.broadcaster_user_name,
    };

    try {
      // Pull stream info from Twitch API
      let streamResult = await this.twitchApi.getStreams({
        channel: user.id,
      });

      // Make sure there's actually a stream
      if (!streamResult || !streamResult.data || !streamResult.data[0]) {
        console.log(`No streams found for ${user.login}!`);
        return;
      }

      let stream = streamResult.data[0];

      // Replace some stream data from API if this is an update event
      if (eventType === CHANNEL_UPDATE_EVENT) {
        stream.game_id = event.category_id;
        stream.title = event.title;
      }

      console.log(`Found stream for ${user.login}`);
      console.log(stream);

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

        // Treat this as a stream.online event:
        // - If this wasn't cached before (meaning game was not alttp or title didn't pass)
        // - If they switched from another game -> alttp
        if (!cachedStream) {
          console.log(
            `Stream not found in cache after ${CHANNEL_UPDATE_EVENT}, treating as ${STREAM_ONLINE_EVENT}!`
          );
          eventType = STREAM_ONLINE_EVENT;
        } else if (cachedStream.game_id != event.category_id) {
          console.log(
            `Switched game to alttp, treating as ${STREAM_ONLINE_EVENT}!`
          );
          eventType = STREAM_ONLINE_EVENT;
        } else if (
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
  }
}

module.exports = RunnerWatcher;
