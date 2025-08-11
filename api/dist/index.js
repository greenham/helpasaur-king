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
const cors_1 = __importDefault(require("cors"));
const morgan_1 = __importDefault(require("morgan"));
const mongoose_1 = __importDefault(require("mongoose"));
const socket_io_client_1 = require("socket.io-client");
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const ms_1 = __importDefault(require("ms"));
const routes_1 = __importDefault(require("./routes"));
const packageJson = __importStar(require("../package.json"));
const { MONGODB_URL, PORT, API_CORS_ORIGINS_WHITELIST, WEBSOCKET_RELAY_SERVER, } = process.env;
// Track API stats
const startTime = Date.now();
let requestCount = 0;
let errorCount = 0;
// Middleware to track requests
const trackRequests = (_req, res, next) => {
    requestCount++;
    // Track errors
    res.on("finish", () => {
        if (res.statusCode >= 400) {
            errorCount++;
        }
    });
    next();
};
mongoose_1.default.connect(MONGODB_URL || "");
const database = mongoose_1.default.connection;
database.on("error", (error) => {
    console.log(error);
});
database.once("connected", () => {
    console.log("Connected to MongoDB!");
});
// Connect to websocket relay to communicate with other services
const wsRelay = (0, socket_io_client_1.io)(WEBSOCKET_RELAY_SERVER || "", {
    query: { clientId: `${packageJson.name} v${packageJson.version}` },
});
console.log(`Connecting to websocket relay server on port ${WEBSOCKET_RELAY_SERVER}...`);
wsRelay.on("connect_error", (err) => {
    console.log(`Connection error!`);
    console.log(err);
});
wsRelay.on("connect", () => {
    console.log(`✅ Connected! Socket ID: ${wsRelay.id}`);
});
const app = (0, express_1.default)();
// Only allow requests from whitelisted origins
const originWhitelist = (API_CORS_ORIGINS_WHITELIST || "").split(",");
app.use((0, cors_1.default)({ origin: originWhitelist, credentials: true }));
// Set up logging
app.use((0, morgan_1.default)("short"));
// Track requests
app.use(trackRequests);
// Allow the app to use the websocket relay
app.wsRelay = wsRelay;
// Use cookie-parser
app.use((0, cookie_parser_1.default)());
// Health check endpoint
app.get("/health", async (_req, res) => {
    try {
        const uptimeMs = Date.now() - startTime;
        res.status(200).json({
            status: "healthy",
            service: "api",
            version: packageJson.version,
            uptime: (0, ms_1.default)(uptimeMs, { long: true }),
            uptimeMs: uptimeMs,
            requestCount: requestCount,
            errorCount: errorCount,
            errorRate: requestCount > 0
                ? `${((errorCount / requestCount) * 100).toFixed(2)}%`
                : "0%",
            dbConnected: database.readyState === 1,
            websocketConnected: wsRelay.connected,
            environment: process.env.NODE_ENV || "development",
        });
    }
    catch (error) {
        console.error("Health check error:", error);
        res.status(503).json({
            status: "unhealthy",
            service: "api",
            error: error.message,
        });
    }
});
// Set up routes
app.use(routes_1.default);
app.use(function (err, _req, res, next) {
    if (err.name === "UnauthorizedError") {
        res.status(401).json({ error: err.name + ": " + err.message });
    }
    else if (err.code === "permission_denied") {
        res.status(403).send("Forbidden");
    }
    else {
        next(err);
    }
});
app.listen(Number(PORT) || 3000, () => {
    console.log(`Helpasaur API Server Started at ${PORT}`);
});
process.on("unhandledRejection", (error) => {
    console.error("Unhandled promise rejection:", error);
});
//# sourceMappingURL=index.js.map