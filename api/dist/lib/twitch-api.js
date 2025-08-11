"use strict";
const TwitchApi = require("node-twitch").default;
const { TWITCH_EVENTSUB_SECRET_KEY, TWITCH_EVENTSUB_WEBHOOK_URL } = process.env;
const STREAM_ONLINE_EVENT = "stream.online";
const CHANNEL_UPDATE_EVENT = "channel.update";
class TwitchApiWithEventSub extends TwitchApi {
    constructor(options) {
        super(options);
    }
    getSubscriptions(params = false) {
        let queryString = "";
        if (params) {
            queryString = "?" + new URLSearchParams(params).toString();
        }
        return this._get(`/eventsub/subscriptions${queryString}`);
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
    clearSubscriptions() {
        return new Promise((resolve, reject) => {
            this.getSubscriptions()
                .then((res) => {
                console.log(`Found ${res.data.length} subscriptions to delete...`);
                if (res.data.length === 0) {
                    resolve();
                }
                const deletions = res.data.map((s) => {
                    return this.deleteSubscription(s.id);
                });
                Promise.allSettled(deletions).then(resolve);
            })
                .catch((err) => {
                console.error(err);
                resolve();
            });
        });
    }
    async subscribeToStreamEvents(data) {
        const events = [STREAM_ONLINE_EVENT, CHANNEL_UPDATE_EVENT];
        const { channel, userId } = data;
        const subscriptions = events.map((event) => {
            console.log(`Creating ${event} event subscription for ${channel}`);
            return this.createSubscription(userId, event);
        });
        return await Promise.allSettled(subscriptions);
    }
}
module.exports = TwitchApiWithEventSub;
//# sourceMappingURL=twitch-api.js.map