const { Server } = require("socket.io");
const Listener = require("./listener");
const TwitchApi = require("./twitchApi");

const { STREAM_ALERTS_WEBSOCKET_SERVER_PORT, TWITCH_WEBHOOK_LISTENER_PORT } =
  process.env;

const { STREAM_ONLINE_EVENT } = require("../constants");

class RunnerWatcher {
  constructor(config) {
    this.config = config;

    this.twitchApi = new TwitchApi({
      clientId: this.config.clientId,
      clientSecret: this.config.clientSecret,
    });

    this.twitchApi.on("ready", () => {
      this.init();
    });
  }

  init() {
    this.io = new Server();

    this.io.on("connection", (socket) => {
      console.log(`New WSS connection: ${socket.id}`);
      socket.on("disconnect", () => {
        console.log(`WSS Client Disconnected: ${socket.id}`);
      });
    });

    this.io.listen(STREAM_ALERTS_WEBSOCKET_SERVER_PORT);

    this.listener = new Listener();
    this.listener.listen(TWITCH_WEBHOOK_LISTENER_PORT);
    this.listener.on(STREAM_ONLINE_EVENT, async (event) => {
      console.log(`Received ${STREAM_ONLINE_EVENT} event:`);
      console.log(event);

      let user = {
        id: event.broadcaster_user_id,
        login: event.broadcaster_user_login,
        name: event.broadcaster_user_name,
      };

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
        console.log(`Found stream data:`);
        console.log(stream);

        // @TODO: Subscribe to channel updates here so we get game/title changes and can emit those too

        // Ensure stream is alttp
        if (!this.config.alttpGameIds.includes(stream.game_id)) {
          console.log(`Game is not alttp, skipping...`);
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
        let userData;
        if (!userResult || !userResult.data || !userResult.data[0]) {
          console.log(`Unable to get data for user ${user.name} (${user.id})`);
        } else {
          userData = userResult.data[0];
          console.log(`Found user data:`);
          console.log(userData);
        }

        stream.user = userData;

        console.log(
          `Filters passed! Broadcasting ${STREAM_ONLINE_EVENT} event to clients...`
        );

        // Broadcast event message via websocket server
        this.io.emit(STREAM_ONLINE_EVENT, stream);
      } catch (err) {
        console.error(err);
      }
    });
  }
}

module.exports = RunnerWatcher;
