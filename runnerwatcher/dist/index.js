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
const socket_io_client_1 = require("socket.io-client");
const helpa_api_client_1 = require("helpa-api-client");
const runner_watcher_1 = __importDefault(require("./lib/runner-watcher"));
const packageJson = __importStar(require("../package.json"));
const { SERVICE_NAME, WEBSOCKET_RELAY_SERVER } = process.env;
const helpaApi = new helpa_api_client_1.HelpaApi({
    apiHost: process.env.API_HOST || "",
    apiKey: process.env.API_KEY || "",
    serviceName: SERVICE_NAME || "",
});
async function init() {
    try {
        const streamAlertsConfig = await helpaApi.getServiceConfig();
        const runnerwatcher = new runner_watcher_1.default(streamAlertsConfig);
        const wsRelay = (0, socket_io_client_1.io)(WEBSOCKET_RELAY_SERVER || "", {
            query: { clientId: `${packageJson.name} v${packageJson.version}` },
        });
        console.log(`Connecting to websocket relay server: ${WEBSOCKET_RELAY_SERVER}...`);
        wsRelay.on("connect_error", (err) => {
            console.log(`Connection error!`);
            console.log(err);
        });
        wsRelay.on("connect", () => {
            console.log(`Connected! Socket ID: ${wsRelay.id}`);
        });
        runnerwatcher.on("streamEvent", (data) => {
            wsRelay.emit("streamAlert", data);
        });
    }
    catch (err) {
        console.error(err);
    }
}
init();
//# sourceMappingURL=index.js.map