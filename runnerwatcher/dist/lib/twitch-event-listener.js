"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const crypto = __importStar(require("crypto"));
const events_1 = require("events");
const ms_1 = __importDefault(require("ms"));
const packageJson = __importStar(require("../../package.json"));
const { TWITCH_EVENTSUB_SECRET_KEY } = process.env;
const constants_1 = require("../constants");
class TwitchEventListener extends events_1.EventEmitter {
    constructor() {
        super();
        this.app = (0, express_1.default)();
        this.listeningPort = null;
        this.startTime = Date.now();
        this.eventsReceived = 0;
        // Need raw body for verification
        this.app.use(express_1.default.raw({ type: "application/json" }));
        // Health check endpoint
        this.app.get("/health", (_req, res) => {
            try {
                const uptimeMs = Date.now() - this.startTime;
                res.status(200).json({
                    status: "healthy",
                    service: "runnerwatcher",
                    version: packageJson.version,
                    port: this.listeningPort || "not started",
                    uptime: uptimeMs ? (0, ms_1.default)(uptimeMs, { long: true }) : "0 ms",
                    uptimeMs: uptimeMs, // keep raw ms for monitoring tools
                    eventsReceived: this.eventsReceived,
                    environment: process.env.NODE_ENV || "development",
                    webhookConfigured: !!process.env.TWITCH_EVENTSUB_WEBHOOK_URL, // just boolean, not the actual URL
                });
            }
            catch (error) {
                console.error("Health check error:", error);
                res.status(503).json({
                    status: "unhealthy",
                    service: "runnerwatcher",
                    error: error.message,
                });
            }
        });
        this.app.post("/eventsub", (req, res) => {
            const signature = req.get(constants_1.TWITCH_MESSAGE_SIGNATURE);
            const messageId = req.get(constants_1.TWITCH_MESSAGE_ID);
            const messageTimestamp = req.get(constants_1.TWITCH_MESSAGE_TIMESTAMP);
            if (!this.verifySignature(signature || "", messageId || "", messageTimestamp || "", req.body)) {
                res.status(403).send("Forbidden"); // Reject requests with invalid signatures
                return;
            }
            // Get JSON object from body for processing
            const notification = JSON.parse(req.body);
            const messageType = req.get(constants_1.MESSAGE_TYPE);
            switch (messageType) {
                case constants_1.MESSAGE_TYPE_VERIFICATION:
                    console.log(`Received Twitch webhook challenge request, responding with: ${notification.challenge}`);
                    // Returning a 200 status with the received challenge to complete webhook creation flow
                    res.status(200).type("txt").send(notification.challenge);
                    break;
                case constants_1.MESSAGE_TYPE_NOTIFICATION:
                    console.log(`Received ${messageType} notification`);
                    // Emit event for processing
                    this.eventsReceived++;
                    this.emit("notification", notification);
                    // Respond with 204 for Twitch
                    res.sendStatus(204);
                    break;
                case constants_1.MESSAGE_TYPE_REVOCATION:
                    console.log(`${notification.subscription?.type} notifications revoked!`);
                    console.log(`reason: ${notification.subscription}`);
                    // Respond with 204 for Twitch
                    res.sendStatus(204);
                    break;
                default:
                    console.log(`Unknown message type: ${messageType}`);
                    res.sendStatus(204);
                    break;
            }
        });
    }
    verifySignature(signature, messageId, messageTimestamp, body) {
        const message = messageId + messageTimestamp + body;
        const hmac = "sha256=" +
            crypto
                .createHmac("sha256", TWITCH_EVENTSUB_SECRET_KEY || "")
                .update(message)
                .digest("hex");
        return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(signature));
    }
    listen(port) {
        this.listeningPort = port;
        this.app.listen(port, () => {
            console.log(`Event listener started on port ${port}`);
        });
    }
}
exports.default = TwitchEventListener;
//# sourceMappingURL=twitch-event-listener.js.map