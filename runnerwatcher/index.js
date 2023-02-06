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

    twitchApi = new TwitchApi({
      client_id: streamAlertsConfig.clientId,
      client_secret: streamAlertsConfig.clientSecret,
    });

    // const eventSubs = new TwitchEventSubApi({
    //   clientId: streamAlertsConfig.clientId,
    //   clientSecret: streamAlertsConfig.clientSecret,
    // });

    // eventSubs.on("ready", () => {

    //   eventSubs
    //     .clearSubscriptions()
    //     .then(() => {
    //       console.log(
    //         `Existing subscriptions cleared. Creating new subscriptions for ${streamAlertsConfig.channels.length} configured channels...`
    //       );
    //       streamAlertsConfig.channels.forEach((user) => {
    //         eventSubs
    //           .createSubscription(user.id)
    //           .then((res) => {
    //             let newSub = res.data.data.shift();
    //             console.log(
    //               `Subscription ${newSub.id} ${newSub.status} at ${newSub.created_at} (${user.login})`
    //             );
    //           })
    //           .catch((err) => {
    //             console.error(
    //               `Error creating subscription for ${user.login}: ${err.message}`
    //             );
    //             console.error(`${err.status} - ${err.code}`);
    //             console.error(JSON.stringify(err.config.data));
    //           });
    //       });
    //     })
    //     .catch(console.error);
    // });
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
    let streamResult = await twitchApi.getStreams({ channel: user.id });
    if (!streamResult || !streamResult.data || !streamResult.data[0]) {
      throw new Error(`No streams found for ${user.login} (${user.id})`);
    }

    let stream = streamResult.data[0];
    console.log(
      `${user.name} went live at ${event.started_at}, playing game ID ${stream.game_id}`
    );
    console.log(`Title: ${stream.title}`);
    console.log(stream);

    // Ensure stream is alttp and passes filters
    const speedrunTester = new RegExp(streamAlertsConfig.statusFilters, "i");
    if (stream.game_id != streamAlertsConfig.gameId) {
      console.log(
        `Game ID ${stream.game_id} is not alttp (${streamAlertsConfig.gameId}), skipping...`
      );
      return;
    }

    if (!speedrunTester.test(stream.title)) {
      console.log(`Stream title does not pass filters, skipping...`);
      return;
    }

    // Pull user info from Twitch API
    // @TODO: Implement caching
    let userResult = await twitchApi.getUsers(user.id);
    let userData;
    if (!userResult || !userResult.data) {
      console.log(`Unable to get data for user ${user.name} (${user.id})`);
    } else {
      userData = userResult.data[0];
    }

    stream.user = userData;

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
