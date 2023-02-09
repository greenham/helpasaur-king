const TwitchApi = require("./twitchApi");
const logPrefix = "[EventSub]";

class SubscriptionManager {
  constructor(config) {
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;

    this.api = new TwitchApi({
      clientId: this.clientId,
      clientSecret: this.clientSecret,
    });

    this.init();
  }

  init() {
    this.api.on("ready", () => {
      console.log(`${logPrefix} API ready`);
    });
  }

  clearSubscriptions() {
    this.api
      .clearSubscriptions()
      .then(() => {
        console.log(`${logPrefix} subscriptions cleared`);
      })
      .catch(console.error);
  }

  subscribeToUsers(channels) {
    channels.forEach((user) => {
      this.api
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
  }
}

module.exports = SubscriptionManager;
