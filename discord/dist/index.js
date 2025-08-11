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
    const bot = new bot_1.DiscordBot(config, helpaApiClient);
    // Listen for ready event to track bot status
    bot.discordClient.once("ready", () => {
        // Start health check server after bot is ready
        const healthApp = (0, express_1.default)();
        const healthPort = Number(process.env.DISCORD_HEALTH_PORT) || 3010;
        healthApp.get("/health", (_req, res) => {
            try {
                res.status(200).json({
                    status: "healthy",
                    service: "discord",
                    version: packageJson.version,
                    connected: bot.discordClient.ws.status === 0,
                    uptime: bot.discordClient.uptime
                        ? (0, ms_1.default)(bot.discordClient.uptime, { long: true })
                        : "0 ms",
                    uptimeMs: bot.discordClient.uptime, // keep raw ms for monitoring tools
                    ping: bot.discordClient.ws.ping
                        ? `${bot.discordClient.ws.ping}ms`
                        : "N/A",
                    guilds: bot.discordClient.guilds.cache.size, // number of servers
                    users: bot.discordClient.users.cache.size, // cached users
                    channels: bot.discordClient.channels.cache.size, // cached channels
                    commands: bot.discordClient.commands?.size || 0, // registered commands
                    readyAt: bot.discordClient.readyAt, // timestamp when bot became ready
                    environment: process.env.NODE_ENV || "development",
                });
            }
            catch (error) {
                res.status(503).json({
                    status: "unhealthy",
                    error: error.message,
                });
            }
        });
        healthApp.listen(healthPort, () => {
            console.log(`Health check endpoint available on port ${healthPort}`);
        });
    });
    bot.start();
})
    .catch((error) => {
    console.error("Error fetching service config:", error);
});
//# sourceMappingURL=index.js.map