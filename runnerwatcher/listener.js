const express = require("express");
const crypto = require("crypto");
const EventEmitter = require("events");

const { TWITCH_EVENTSUB_SECRET_KEY } = process.env;

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
} = require("./constants");

class Listener extends EventEmitter {
  constructor() {
    super();
    this.app = express();

    // Need raw body for verification
    this.app.use(express.raw({ type: "application/json" }));

    this.app.post("/eventsub", (req, res) => {
      const signature = req.get(TWITCH_MESSAGE_SIGNATURE);
      const messageId = req.get(TWITCH_MESSAGE_ID);
      const messageTimestamp = req.get(TWITCH_MESSAGE_TIMESTAMP);

      if (
        !this.verifySignature(signature, messageId, messageTimestamp, req.body)
      ) {
        return res.status(403).send("Forbidden"); // Reject requests with invalid signatures
      }

      // Get JSON object from body for processing
      const notification = JSON.parse(req.body);
      const messageType = req.get(MESSAGE_TYPE);

      switch (messageType) {
        case MESSAGE_TYPE_VERIFICATION:
          console.log(
            `Received Twitch webhook challenge request, responding with: ${notification.challenge}`
          );
          // Returning a 200 status with the received challenge to complete webhook creation flow
          res.status(200).type("txt").send(notification.challenge);
          break;

        case MESSAGE_TYPE_NOTIFICATION:
          console.log(`[${notification.subscription.type}]`);
          console.log(notification.event);
          this.handleNotification(notification);
          res.send(""); // Default .send is a 200 status
          break;

        case MESSAGE_TYPE_REVOCATION:
          res.sendStatus(204);

          console.log(
            `${notification.subscription.type} notifications revoked!`
          );
          console.log(`reason: ${notification.subscription.status}`);
          console.log(
            `condition: ${JSON.stringify(
              notification.subscription.condition,
              null,
              4
            )}`
          );

          // @TODO: Emit an event here for the subscription manager to handle
          break;

        default:
          res.sendStatus(204);
          console.log(`Unknown message type: ${req.get(MESSAGE_TYPE)}`);
      }
    });
  }

  listen(port) {
    this.app.listen(port, () => {
      console.log(`Twitch Webhook Event Listener running on port ${port}`);
    });
  }

  verifySignature(messageSignature, messageID, messageTimestamp, body) {
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

  handleNotification(notification) {
    const { subscription, event } = notification;
    if (
      subscription.type === STREAM_ONLINE_EVENT &&
      event.type === STREAM_ONLINE_TYPE_LIVE
    ) {
      this.emit(STREAM_ONLINE_EVENT, event);
    }
  }
}

module.exports = Listener;
