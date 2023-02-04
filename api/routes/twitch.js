const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const axios = require("axios");
const TwitchApi = require("node-twitch").default;

const Config = require("../models/config");

const { TWITCH_EVENTSUB_SECRET_KEY, TWITCH_EVENTSUB_WEBHOOK_URL } = process.env;

// Notification request headers
const TWITCH_MESSAGE_ID = "Twitch-Eventsub-Message-Id";
const TWITCH_MESSAGE_TIMESTAMP = "Twitch-Eventsub-Message-Timestamp";
const TWITCH_MESSAGE_SIGNATURE = "Twitch-Eventsub-Message-Signature";
const MESSAGE_TYPE = "Twitch-Eventsub-Message-Type";

// Notification message types
const MESSAGE_TYPE_VERIFICATION = "webhook_callback_verification";
const MESSAGE_TYPE_NOTIFICATION = "notification";
const MESSAGE_TYPE_REVOCATION = "revocation";

// Stream Online Event
const STREAM_ONLINE_EVENT = "stream.online";
const STREAM_ONLINE_TYPE_LIVE = "live";

// Need raw body for verification
router.use(express.raw({ type: "application/json" }));

router.post("/eventsub", (req, res) => {
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

function getSubscriptions(after = "", api) {
  return api.get(
    `https://api.twitch.tv/helix/eventsub/subscriptions?after=${after}`
  );
}

function createSubscription(userId, api) {
  return api.post("https://api.twitch.tv/helix/eventsub/subscriptions", {
    type: STREAM_ONLINE_EVENT,
    version: "1",
    condition: {
      broadcaster_user_id: userId,
    },
    transport: {
      method: "webhook",
      callback: `${TWITCH_EVENTSUB_WEBHOOK_URL}/twitch/eventsub`,
      secret: TWITCH_EVENTSUB_SECRET_KEY,
    },
  });
}

function deleteSubscription(id, api) {
  return api.delete(
    `https://api.twitch.tv/helix/eventsub/subscriptions?id=${id}`
  );
}

function clearSubscriptions(after = "", api) {
  getSubscriptions(after, api)
    .then((res) => {
      let subscriptionIds = res.data.data.map((d) => d.id);
      subscriptionIds.forEach((sid) => {
        deleteSubscription(sid, api)
          .then((res) => {
            console.log(`Deleted subscription ${sid}`);
          })
          .catch((err) => {
            console.error(err.message);
          });
      });

      if (res.data.pagination && res.data.pagination.cursor) {
        clearSubscriptions(res.data.pagination.cursor, api);
      }
    })
    .catch((err) => {
      console.error(err.message);
    });
}

Config.findOne({ id: "streamAlerts" }).then((config) => {
  const streamAlertsConfig = config.config;

  const twitchApiClient = new TwitchApi({
    client_id: streamAlertsConfig.clientId,
    client_secret: streamAlertsConfig.clientSecret,
  });

  twitchApiClient
    ._getAppAccessToken()
    .then((token) => {
      console.log(
        `Twitch app access token for client ${streamAlertsConfig.clientId}: ${token}`
      );
      let twitchEventSubApiClient = axios.create({
        headers: {
          "Client-ID": streamAlertsConfig.clientId,
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      // clearSubscriptions("", twitchEventSubApiClient);

      streamAlertsConfig.channels.slice(0, 10).forEach((user) => {
        createSubscription(user.id, twitchEventSubApiClient)
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
    .catch((err) => {
      console.error(err);
    });
});

// console.log(
//   Array.from(crypto.randomBytes(32), function (byte) {
//     return ("0" + (byte & 0xff).toString(16)).slice(-2);
//   }).join("")
// );

module.exports = router;
