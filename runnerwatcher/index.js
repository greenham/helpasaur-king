const axios = require("axios");
const { Server } = require("socket.io");
const Listener = require("./listener");
const TwitchApi = require("node-twitch").default;
const TwitchEventSubApi = require("./lib/twitch-eventsub-api");

const {
  API_URL,
  API_KEY,
  STREAM_ALERTS_WEBSOCKET_SERVER_PORT,
  TWITCH_WEBHOOK_LISTENER_PORT,
} = process.env;

const { STREAM_ONLINE_EVENT } = require("./constants");

const helpaApi = axios.create({
  baseURL: API_URL,
  headers: {
    Authorization: API_KEY,
  },
});

let streamAlertsConfig;
let twitchApi;

helpaApi
  .get("/configs/streamAlerts")
  .then((res) => {
    streamAlertsConfig = res.data.config;
    const eventSubs = new TwitchEventSubApi({
      clientId: streamAlertsConfig.clientId,
      clientSecret: streamAlertsConfig.clientSecret,
    });

    eventSubs.on("ready", () => {
      twitchApi = new TwitchApi({
        client_id: streamAlertsConfig.clientId,
        client_secret: streamAlertsConfig.clientSecret,
      });

      eventSubs
        .clearSubscriptions()
        .then(() => {
          console.log(
            `Existing subscriptions cleared. Creating new subscriptions for ${streamAlertsConfig.channels.length} configured channels...`
          );
          streamAlertsConfig.channels.forEach((user) => {
            eventSubs
              .createSubscription(user.id)
              .then((res) => {
                let newSub = res.data.data.shift();
                console.log(
                  `Subscription ${newSub.id} ${newSub.status} at ${newSub.created_at} (${user.login})`
                );
              })
              .catch((err) => {
                console.error(
                  `Error creating subscription for ${user.login}: ${err.message}`
                );
                console.error(`${err.status} - ${err.code}`);
                console.error(JSON.stringify(err.config.data));
              });
          });
        })
        .catch(console.error);
    });
  })
  .catch((err) => {
    console.error(err);
  });

const listener = new Listener();
listener.listen(TWITCH_WEBHOOK_LISTENER_PORT);

const io = new Server();

io.on("connection", (socket) => {
  console.log(`New connection: ${socket.id}`);
  socket.on("disconnect", () => {
    console.log(`Disconnected: ${socket.id}`);
  });
});

io.listen(STREAM_ALERTS_WEBSOCKET_SERVER_PORT);

listener.on(STREAM_ONLINE_EVENT, async (event) => {
  let user = {
    id: event.broadcaster_user_id,
    login: event.broadcaster_user_login,
    name: event.broadcaster_user_name,
  };

  // Pull stream info from Twitch API
  try {
    let streamData = await twitchApi.getStreams({
      channel: event.broadcaster_user_login,
    });
    if (!streamData || !streamData.data) {
      throw new Error(
        `No results from API for stream: ${event.broadcaster_user_login}`
      );
    }

    let stream = streamData.data.shift();
    console.log(
      `${user.name} went live at ${event.started_at}, playing game ID ${stream.game_id}`
    );
    console.log(`Title: ${stream.title}`);

    // Ensure stream is alttp and passes filters
    const speedrunTester = new RegExp(streamAlertsConfig.statusFilters, "i");
    if (
      stream.game_id != streamAlertsConfig.gameId ||
      !speedrunTester.test(stream.title)
    ) {
      return;
    }

    // @TODO: Pull user info from Twitch API? (use caching)

    console.log(`Filters passed! Broadcasting event via WSS...`);
    console.log(stream);

    // Broadcast event message via websocket server
    io.emit(STREAM_ONLINE_EVENT, stream);
  } catch (err) {
    console.error(err);
  }
});

// Array.from(crypto.randomBytes(32), function (byte) {
//   return ("0" + (byte & 0xff).toString(16)).slice(-2);
// }).join("");
