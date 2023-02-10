const TwitchApi = require("node-twitch").default;
const { TWITCH_EVENTSUB_SECRET_KEY, TWITCH_EVENTSUB_WEBHOOK_URL } = process.env;

class TwitchApiWithEventSub extends TwitchApi {
  constructor(options) {
    super(options);
  }

  getSubscriptions(params) {
    const queryString = new URLSearchParams(params).toString();
    return this._get(`/eventsub/subscriptions?${queryString}`);
  }

  createSubscription(userId, type, version = "1") {
    return this._post("/eventsub/subscriptions", {
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

  deleteSubscription(id) {
    return this._delete(`/eventsub/subscriptions?id=${id}`);
  }

  clearSubscriptions(after) {
    return new Promise((resolve, reject) => {
      this.getSubscriptions({ after })
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
