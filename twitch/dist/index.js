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
const helpa_api_client_1 = require("helpa-api-client");
const bot_1 = require("./bot");
const express_1 = __importDefault(require("express"));
const ms_1 = __importDefault(require("ms"));
const packageJson = __importStar(require("../package.json"));
const helpaApiClient = new helpa_api_client_1.HelpaApi({
    apiHost: process.env.API_HOST || "",
    apiKey: process.env.API_KEY || "",
    serviceName: process.env.SERVICE_NAME || "",
});
helpaApiClient
    .getServiceConfig()
    .then((config) => {
    if (!config) {
        throw new Error(`Unable to get service config from API!`);
    }
    const bot = new bot_1.TwitchBot(config, helpaApiClient);
    // Get the initial list of active channels the bot should join
    helpaApiClient
        .getAxiosInstance()
        .get("/api/configs/twitch/activeChannels")
        .then((response) => {
        bot.start(response.data);
        // Start health check server after bot starts
        const healthApp = (0, express_1.default)();
        const healthPort = Number(process.env.TWITCH_HEALTH_PORT) || 3011;
        healthApp.get("/health", (_req, res) => {
            try {
                const connectionState = bot.bot?.readyState?.() || "CLOSED";
                const uptimeMs = bot.bot?._connectTimestamp
                    ? Date.now() - bot.bot._connectTimestamp
                    : 0;
                res.status(200).json({
                    status: "healthy",
                    service: "twitch",
                    version: packageJson.version,
                    connected: connectionState === "OPEN",
                    connectionState: connectionState,
                    channelCount: bot.channelList ? bot.channelList.length : 0, // just the count, not names
                    uptime: uptimeMs ? (0, ms_1.default)(uptimeMs, { long: true }) : "0 ms",
                    uptimeMs: uptimeMs, // keep raw ms for monitoring tools
                    commandPrefix: config?.cmdPrefix || "!",
                    username: config?.username || "unknown", // bot's public username is ok
                    environment: process.env.NODE_ENV || "development",
                });
            }
            catch (error) {
                console.error("Health check error:", error);
                res.status(503).json({
                    status: "unhealthy",
                    service: "twitch",
                    error: error.message,
                });
            }
        });
        healthApp.listen(healthPort, () => {
            console.log(`Health check endpoint available on port ${healthPort}`);
        });
    })
        .catch((error) => {
        console.error("Error fetching active channels:", error);
    });
})
    .catch((error) => {
    console.error("Error fetching service config:", error);
});
//# sourceMappingURL=index.js.map