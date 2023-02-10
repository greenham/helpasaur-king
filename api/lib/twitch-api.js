const axios = require("axios");
const EventEmitter = require("events");
const TwitchApi = require("node-twitch").default;
const { TWITCH_EVENTSUB_SECRET_KEY, TWITCH_EVENTSUB_WEBHOOK_URL } = process.env;

class TwitchApiWithEventSub extends TwitchApi {
  constructor(options) {
    super({
      client_id: options.clientId,
      client_secret: options.clientSecret,
    });

    this.clientId = options.clientId;
    this.clientSecret = options.clientSecret;
    this.token = null;

    this.eventSubApi = axios.create({
      baseURL: "https://api.twitch.tv/helix",
      headers: {
        "Content-Type": "application/json",
        "Client-ID": this.clientId,
      },
    });

    this.emitter = new EventEmitter();
    this.emit = this.emitter.emit;
    this.on = this.emitter.on;

    this._getTokenForEventSub();
  }

  _getTokenForEventSub() {
    this._getAppAccessToken()
      .then((token) => {
        console.log(
          `Twitch app access token for client ${this.clientId}: ${token}`
        );

        this.token = token;
        this.eventSubApi.defaults.headers.common[
          "Authorization"
        ] = `Bearer ${this.token}`;

        this.emit("ready");
      })
      .catch(console.error);
  }

  getSubscriptions(after = "") {
    return this.eventSubApi.get(`/eventsub/subscriptions?after=${after}`);
  }

  createSubscription(userId, type, version = "1") {
    return this.eventSubApi.post("/eventsub/subscriptions", {
      type,
      version,
      condition: {
        broadcaster_user_id: userId,
      },
      transport: {
        method: "webhook",
        callback: TWITCH_EVENTSUB_WEBHOOK_URL,
        secret: TWITCH_EVENTSUB_SECRET_KEY,
      },
    });
  }

  deleteSubscription(params) {
    let queryParts = [];
    for (const [key, value] of Object.entries(params)) {
      queryParts.push(`${key}=${value}`);
    }
    return this.eventSubApi.delete(
      `/eventsub/subscriptions?${queryParts.join("&")}`
    );
  }

  clearSubscriptions(after = "") {
    return new Promise((resolve, reject) => {
      this.getSubscriptions(after)
        .then((res) => {
          let subscriptionIds = res.data.data.map((d) => d.id);
          subscriptionIds.forEach((sid) => {
            this.deleteSubscription(sid)
              .then((res) => {
                console.log(`Deleted subscription ${sid}`);
              })
              .catch((err) => {
                console.error(err.message);
              });
          });

          if (res.data.pagination && res.data.pagination.cursor) {
            this.clearSubscriptions(res.data.pagination.cursor);
          } else {
            resolve();
          }
        })
        .catch(reject);
    });
  }
}

module.exports = TwitchApiWithEventSub;
