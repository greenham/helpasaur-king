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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importStar(require("axios"));
const ws_1 = __importDefault(require("ws"));
const uuid_1 = require("uuid");
const node_schedule_1 = __importDefault(require("node-schedule"));
const socket_io_client_1 = require("socket.io-client");
require("dotenv").config();
const { RACETIME_BASE_URL, RACETIME_GAME_CATEGORY_SLUG, RACETIME_BOT_CLIENT_ID, RACETIME_BOT_CLIENT_SECRET, STREAM_ALERTS_WEBSOCKET_SERVER, } = process.env;
const streamAlertsWebsocketServer = String(STREAM_ALERTS_WEBSOCKET_SERVER);
const streamAlerts = (0, socket_io_client_1.io)(streamAlertsWebsocketServer);
console.log(`Trying to connect to ${streamAlertsWebsocketServer}...`);
streamAlerts.on("connect_error", (err) => {
    console.log(`Connection error!`);
    console.log(err);
});
streamAlerts.on("connect", () => {
    console.log(`Connected to stream alerts server: ${streamAlertsWebsocketServer}`);
    console.log(`Socket ID: ${streamAlerts.id}`);
});
const nmgGoal = "Any% NMG";
const weeklyRaceInfoUser = "Weekly Community Race - Starts at 3PM Eastern";
const weeklyRaceInfoBot = "";
const weeklyRaceData = {
    goal: nmgGoal,
    info_user: weeklyRaceInfoUser,
    info_bot: weeklyRaceInfoBot,
    start_delay: 15,
    time_limit: 24,
    streaming_required: false,
    auto_start: true,
    allow_comments: true,
    allow_prerace_chat: true,
    allow_midrace_chat: true,
    allow_non_entrant_chat: true,
    chat_message_delay: 0,
};
// Happy Weekly (room opens 30 minutes before race starts)
const timeToSchedule = {
    dayOfWeek: 0,
    hour: 11,
    minute: 30,
    tz: "America/Los_Angeles",
};
class RaceBot {
    constructor(accessToken) {
        this.accessToken = accessToken;
    }
    static initialize() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`Requesting access token...`);
            const response = yield (0, axios_1.default)({
                method: "POST",
                url: `${RACETIME_BASE_URL}/o/token`,
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                data: {
                    client_id: RACETIME_BOT_CLIENT_ID,
                    client_secret: RACETIME_BOT_CLIENT_SECRET,
                    grant_type: "client_credentials",
                },
            });
            console.log(`Received access token: ${response.data.access_token}`);
            return new RaceBot(response.data.access_token);
        });
    }
    startRace(raceData) {
        return __awaiter(this, void 0, void 0, function* () {
            // Responses:
            //   201 Created: If form is valid and race room is succesfully opened, a 201 is returned. The Location header will provide the URL of the opened race room.
            //   422 Unprocessable Entity: If form is invalid, a 422 is returned. The content body (JSON) will contain an array of errors indicating what the problem(s) were.
            try {
                const response = yield (0, axios_1.default)({
                    method: "POST",
                    data: raceData,
                    url: `${RACETIME_BASE_URL}/o/${RACETIME_GAME_CATEGORY_SLUG}/startrace`,
                    headers: {
                        Authorization: `Bearer ${this.accessToken}`,
                        "Content-Type": "application/x-www-form-urlencoded",
                    },
                });
                if (response.status === 201) {
                    // Handle a successful creation (201 Created) response
                    const locationHeader = response.headers.location;
                    console.log("Race room created. Location:", locationHeader);
                    return locationHeader;
                }
                else {
                    // Handle other response statuses or errors here
                    console.log("Received an unexpected response:", response.status);
                    return false;
                }
            }
            catch (error) {
                if (error instanceof axios_1.AxiosError) {
                    if (error.response) {
                        if (error.response.status === 422) {
                            // Handle an unprocessable entity (422 Unprocessable Entity) response
                            const errors = error.response.data;
                            console.log("Validation errors:", errors);
                        }
                        else {
                            console.log("Received an unexpected response:", error.response.status);
                        }
                    }
                    else if (error.request) {
                        // The request was made but no response was received
                        // `error.request` is an instance of http.ClientRequest
                        console.log(error.request);
                    }
                    else {
                        // Something happened in setting up the request that triggered an Error
                        console.log("Error", error.message);
                    }
                    console.log(error.config);
                }
                else {
                    console.log("Caught exception outside of Axios:", error);
                }
                return false;
            }
        });
    }
    connectToRaceRoom(raceRoom) {
        return new Promise((resolve, reject) => {
            // get websocket bot url via API
            console.log("Fetching race details...");
            axios_1.default
                .get(`${RACETIME_BASE_URL}${raceRoom}/data`)
                .then((response) => {
                console.log("Race details:", response.data);
                const raceData = response.data;
                if (!raceData.websocket_bot_url) {
                    reject("No websocket bot URL in response data");
                }
                // connect to websocket
                console.log("Connecting to websocket:", raceData.websocket_bot_url);
                const ws = new ws_1.default(`${RACETIME_BASE_URL}${raceData.websocket_bot_url}?token=${this.accessToken}`);
                ws.on("error", console.error);
                ws.on("open", function open() {
                    console.log("Opened websocket connection to race room:", raceRoom);
                    resolve(ws);
                });
            })
                .catch(reject);
        });
    }
}
const weeklyRaceJob = node_schedule_1.default.scheduleJob(timeToSchedule, () => __awaiter(void 0, void 0, void 0, function* () {
    console.log(`Creating weekly race room...`);
    const racebot = yield RaceBot.initialize();
    const raceResult = yield racebot.startRace(weeklyRaceData);
    if (!raceResult) {
        console.error(`Unable to create weekly race room!`);
        return;
    }
    // raceResult will have /<category>/<room-slug>
    streamAlerts.emit("weeklyRaceRoomCreated", `${RACETIME_BASE_URL}${raceResult}`);
    racebot
        .connectToRaceRoom(raceResult)
        .then((raceRoomWebsocket) => {
        raceRoomWebsocket.on("message", function message(data) {
            console.log("received message:", JSON.stringify(JSON.parse(data)));
        });
        const happyWeeklyMessage = {
            action: "message",
            data: {
                message: "Happy Weekly!",
                pinned: false,
                actions: null,
                direct_to: null,
                guid: (0, uuid_1.v4)(),
            },
        };
        raceRoomWebsocket.send(JSON.stringify(happyWeeklyMessage));
    })
        .catch((error) => {
        console.log("Unable to connect to race room:", error);
    });
}));
console.log(`Weekly race room creation scheduled, next invocation: ${weeklyRaceJob.nextInvocation()}`);
