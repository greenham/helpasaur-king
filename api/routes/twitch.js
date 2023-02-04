const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const { TWITCH_EVENTSUB_SECRET_KEY } = process.env;

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

// console.log(
//   Array.from(crypto.randomBytes(32), function (byte) {
//     return ("0" + (byte & 0xff).toString(16)).slice(-2);
//   }).join("")
// );

module.exports = router;
