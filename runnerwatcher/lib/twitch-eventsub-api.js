const axios = require("axios");
const EventEmitter = require("events");
const TwitchApi = require("node-twitch").default;
const { TWITCH_EVENTSUB_SECRET_KEY, TWITCH_EVENTSUB_WEBHOOK_URL } = process.env;
const { STREAM_ONLINE_EVENT } = require("../constants");

class TwitchEventSubApi extends EventEmitter {
  constructor(options) {
    super();

    this.clientId = options.clientId;
    this.clientSecret = options.clientSecret;
    this.token = null;

    this.api = axios.create({
      baseURL: "https://api.twitch.tv/helix",
      headers: {
        "Content-Type": "application/json",
        "Client-ID": this.clientId,
      },
    });

    this._getToken();
  }

  _getToken() {
    const tokenGrabber = new TwitchApi({
      client_id: this.clientId,
      client_secret: this.clientSecret,
    });

    tokenGrabber
      ._getAppAccessToken()
      .then((token) => {
        console.log(
          `Twitch app access token for client ${this.clientId}: ${token}`
        );
        this.token = token;
        this.api.defaults.headers.common[
          "Authorization"
        ] = `Bearer ${this.token}`;
        this.emit("ready");
      })
      .catch(console.error);
  }

  getSubscriptions(after = "") {
    return this.api.get(`/eventsub/subscriptions?after=${after}`);
  }

  createSubscription(userId) {
    return this.api.post("/eventsub/subscriptions", {
      type: STREAM_ONLINE_EVENT,
      version: "1",
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

  deleteSubscription(id) {
    return this.api.delete(`/eventsub/subscriptions?id=${id}`);
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

module.exports = TwitchEventSubApi;
