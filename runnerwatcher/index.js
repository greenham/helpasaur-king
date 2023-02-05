const express = require("express");
const crypto = require("crypto");
const axios = require("axios");
const { Server } = require("socket.io");

const {
  API_URL,
  API_KEY,
  TWITCH_EVENTSUB_SECRET_KEY,
  TWITCH_WEBHOOK_LISTENER_PORT,
  STREAM_ALERTS_WEBSOCKET_SERVER_PORT,
} = process.env;
const {
  TWITCH_MESSAGE_ID,
  TWITCH_MESSAGE_TIMESTAMP,
  TWITCH_MESSAGE_SIGNATURE,
  MESSAGE_TYPE,
  MESSAGE_TYPE_VERIFICATION,
  MESSAGE_TYPE_NOTIFICATION,
  MESSAGE_TYPE_REVOCATION,
  STREAM_ONLINE_EVENT,
  STREAM_ONLINE_TYPE_LIVE,
} = require("constants");

const app = express();
const helpaApi = axios.create({
  baseURL: API_URL,
  headers: {
    Authorization: API_KEY,
  },
});
const twitchEventSubApi = require("./lib/twitch-eventsub-api");

helpaApi
  .get("/configs/streamAlerts")
  .then((res) => {
    const streamAlertsConfig = res.data.config;
    const eventSubs = new twitchEventSubApi({
      clientId: streamAlertsConfig.clientId,
      clientSecret: streamAlertsConfig.clientSecret,
    });

    eventSubs.clearSubscriptions();

    // streamAlertsConfig.channels.slice(0, 10).forEach((user) => {
    //   eventSubs
    //     .createSubscription(user.id)
    //     .then((res) => {
    //       let newSub = res.data.data.shift();
    //       console.log(
    //         `Subscription ${newSub.id} ${newSub.status} at ${newSub.created_at} (${user.login})`
    //       );
    //     })
    //     .catch((err) => {
    //       console.error(
    //         `Error creating subscription for ${user.login}: ${err.message}`
    //       );
    //       console.error(`${err.status} - ${err.code}`);
    //       console.error(JSON.stringify(err.config.data));
    //     });
    // });
  })
  .catch((err) => {
    console.error(err);
  });

// Need raw body for verification
app.use(express.raw({ type: "application/json" }));

app.post("/eventsub", (req, res) => {
  const signature = req.get(TWITCH_MESSAGE_SIGNATURE);
  const messageId = req.get(TWITCH_MESSAGE_ID);
  const messageTimestamp = req.get(TWITCH_MESSAGE_TIMESTAMP);

  if (!verifySignature(signature, messageId, messageTimestamp, req.body)) {
    return res.status(403).send("Forbidden"); // Reject requests with invalid signatures
  }

  // Get JSON object from body for processing
  let notification = JSON.parse(req.body);

  if (req.get(MESSAGE_TYPE) === MESSAGE_TYPE_VERIFICATION) {
    console.log(
      `Received Twitch webhook challenge request, responding with: ${notification.challenge}`
    );
    // Returning a 200 status with the received challenge to complete webhook creation flow
    res.status(200).type("txt").send(notification.challenge);
  } else if (req.get(MESSAGE_TYPE) === MESSAGE_TYPE_NOTIFICATION) {
    console.log(`[${notification.subscription.type}]`);
    console.log(notification.event);
    handleNotification(notification);
    res.send(""); // Default .send is a 200 status
  } else if (req.get(MESSAGE_TYPE) === MESSAGE_TYPE_REVOCATION) {
    res.sendStatus(204);

    console.log(`${notification.subscription.type} notifications revoked!`);
    console.log(`reason: ${notification.subscription.status}`);
    console.log(
      `condition: ${JSON.stringify(
        notification.subscription.condition,
        null,
        4
      )}`
    );
  } else {
    res.sendStatus(204);
    console.log(`Unknown message type: ${req.get(MESSAGE_TYPE)}`);
  }
});

function verifySignature(messageSignature, messageID, messageTimestamp, body) {
  let message = messageID + messageTimestamp + body;
  let signature = crypto
    .createHmac("sha256", TWITCH_EVENTSUB_SECRET_KEY)
    .update(message)
    .digest("hex");
  let expectedSignatureHeader = "sha256=" + signature;

  return crypto.timingSafeEqual(
    Buffer.from(expectedSignatureHeader),
    Buffer.from(messageSignature)
  );
}

function handleNotification(notification) {
  const { subscription, event } = notification;
  if (
    subscription.type === STREAM_ONLINE_EVENT &&
    event.type === STREAM_ONLINE_TYPE_LIVE
  ) {
    let user = {
      id: event.broadcaster_user_id,
      login: event.broadcaster_user_login,
      name: event.broadcaster_user_name,
    };

    console.log(`${user.name} went live at ${event.started_at}`);
  }
}

app.listen(TWITCH_WEBHOOK_LISTENER_PORT, () => {
  console.log(
    `Twitch Webhook Event Listener running on port ${TWITCH_WEBHOOK_LISTENER_PORT}`
  );
});

const io = new Server();

io.on("connection", (socket) => {
  console.log(`New connection: ${socket.id}`);
  socket.on("disconnect", () => {
    console.log(`Disconnected: ${socket.id}`);
  });
});

io.listen(STREAM_ALERTS_WEBSOCKET_SERVER_PORT);

// Array.from(crypto.randomBytes(32), function (byte) {
//   return ("0" + (byte & 0xff).toString(16)).slice(-2);
// }).join("");
