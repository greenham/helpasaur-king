"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
const twitch_event_listener_1 = __importDefault(require("./twitch-event-listener"));
const node_twitch_1 = __importDefault(require("node-twitch"));
const { TWITCH_WEBHOOK_LISTENER_PORT } = process.env;
const constants_1 = require("../constants");
const DELAY_FOR_API_SECONDS = 10;
const ALERT_DELAY_SECONDS = 15 * 60;
// Maintain a cache of streams we've recently alerted
let cachedStreams = [];
class RunnerWatcher extends events_1.EventEmitter {
    constructor(config) {
        super();
        this.config = config;
        if (!this.config.clientId || !this.config.clientSecret) {
            throw new Error(`Missing config parameter! clientId and clientSecret must be set.`);
        }
        this.listener = new twitch_event_listener_1.default();
        this.init();
    }
    init() {
        this.listener.listen(Number(TWITCH_WEBHOOK_LISTENER_PORT) || 3012);
        this.listener.on("notification", async (notification) => {
            console.log("\r\n-------------------------------------\r\n");
            console.log(`Received ${notification.subscription.type} event for ${notification.event.broadcaster_user_login}`);
            console.log(notification.event);
            console.log(`Processing event in ${DELAY_FOR_API_SECONDS} seconds...`);
            // Waiting here to ensure fresh data is available via Twitch API
            setTimeout(() => {
                this.processEvent(notification);
            }, DELAY_FOR_API_SECONDS * 1000);
        });
    }
    async processEvent(notification) {
        const { subscription, event } = notification;
        let eventType = subscription.type;
        const user = {
            id: event.broadcaster_user_id,
            login: event.broadcaster_user_login,
            name: event.broadcaster_user_name,
        };
        try {
            const twitchApi = new node_twitch_1.default({
                client_id: this.config.clientId,
                client_secret: this.config.clientSecret,
            });
            // Pull stream info from Twitch API
            let streamResult = await twitchApi.getStreams({
                channel: user.id,
            });
            // Make sure there's actually a stream
            if (!streamResult || !streamResult.data || !streamResult.data[0]) {
                console.log(`No streams found for ${user.login}!`);
                return;
            }
            let stream = streamResult.data[0];
            // Replace some stream data from API if this is an update event
            if (eventType === constants_1.CHANNEL_UPDATE_EVENT) {
                console.log(`Updating stream data from ${constants_1.CHANNEL_UPDATE_EVENT} event`);
                stream.title = event.title || stream.title;
                stream.game_id = event.category_id || stream.game_id;
                stream.game_name = event.category_name || stream.game_name;
                stream.is_mature = event.is_mature || stream.is_mature;
            }
            // If this is a new stream, add it to the cache
            if (eventType === constants_1.STREAM_ONLINE_EVENT) {
                cachedStreams.push({
                    id: stream.id,
                    alertedAt: Date.now(),
                });
            }
            // Clean up old cached streams
            this.cleanupCachedStreams();
            // Check if we should alert for this stream
            if (this.shouldAlert(stream, eventType)) {
                console.log(`✅ Alerting for ${user.login}'s stream!`);
                this.emit("streamEvent", {
                    eventType,
                    user,
                    stream,
                });
            }
            else {
                console.log(`❌ Not alerting for ${user.login}'s stream (recently alerted or wrong type)`);
            }
        }
        catch (error) {
            console.error(`Error processing event:`, error);
        }
    }
    shouldAlert(stream, eventType) {
        // Only alert for live streams
        if (stream.type !== constants_1.STREAM_ONLINE_TYPE_LIVE) {
            return false;
        }
        // For new streams, always alert
        if (eventType === constants_1.STREAM_ONLINE_EVENT) {
            return true;
        }
        // For updates, check if we've alerted recently
        const cachedStream = cachedStreams.find((cs) => cs.id === stream.id);
        if (!cachedStream) {
            // Haven't alerted for this stream before
            return true;
        }
        const timeSinceAlert = Date.now() - cachedStream.alertedAt;
        if (timeSinceAlert > ALERT_DELAY_SECONDS * 1000) {
            // Update the alert time
            cachedStream.alertedAt = Date.now();
            return true;
        }
        return false;
    }
    cleanupCachedStreams() {
        const now = Date.now();
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours
        cachedStreams = cachedStreams.filter((cs) => {
            return now - cs.alertedAt < maxAge;
        });
    }
}
exports.default = RunnerWatcher;
//# sourceMappingURL=runner-watcher.js.map