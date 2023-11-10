"use strict";
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
const uuid_1 = require("uuid");
const node_schedule_1 = __importDefault(require("node-schedule"));
const socket_io_client_1 = require("socket.io-client");
const RaceBot_1 = __importDefault(require("./lib/RaceBot"));
const { RACETIME_BASE_URL, WEBSOCKET_RELAY_SERVER, RACETIME_BOT_CLIENT_ID, RACETIME_BOT_CLIENT_SECRET, RACETIME_GAME_CATEGORY_SLUG_Z3, } = process.env;
if (!RACETIME_BASE_URL ||
    !WEBSOCKET_RELAY_SERVER ||
    !RACETIME_BOT_CLIENT_ID ||
    !RACETIME_BOT_CLIENT_SECRET ||
    !RACETIME_GAME_CATEGORY_SLUG_Z3) {
    console.error("At least one required environment variable is not set!");
    process.exit(1);
}
const wsRelayServer = String(WEBSOCKET_RELAY_SERVER);
const wsRelay = (0, socket_io_client_1.io)(wsRelayServer);
console.log(`Connecting to websocket relay server: ${wsRelayServer}...`);
wsRelay.on("connect_error", (err) => {
    console.log(`Connection error!`);
    console.log(err);
});
wsRelay.on("connect", () => {
    console.log(`Connected! Socket ID: ${wsRelay.id}`);
});
const nmgGoal = "Any% NMG";
//const weeklyRaceInfoUser = "Weekly Community Race - Starts at 3PM Eastern";
const weeklyRaceInfoUser = "!TEST RACE!";
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
// Happy Weekly
// (room opens 30 minutes before race starts)
const weeklyRaceStartOffsetSeconds = 30 * 60;
const timeToSchedule = {
    dayOfWeek: 0,
    hour: 11,
    minute: 30,
    tz: "America/Los_Angeles",
};
const createRaceRoom = (game, raceData) => {
    return new Promise((resolve, reject) => {
        RaceBot_1.default.initialize(RACETIME_BOT_CLIENT_ID, RACETIME_BOT_CLIENT_SECRET)
            .then((racebot) => racebot.startRace(game, raceData))
            .then((raceResult) => {
            resolve(String(raceResult));
        })
            .catch((error) => {
            console.error(`Unable to create race room!`);
            reject(error);
        });
    });
};
const listenToRaceRoom = (raceRoomSlug) => {
    return new Promise((resolve, reject) => {
        RaceBot_1.default.initialize(RACETIME_BOT_CLIENT_ID, RACETIME_BOT_CLIENT_SECRET)
            .then((racebot) => racebot.connectToRaceRoom(raceRoomSlug))
            .then((wsRaceRoom) => {
            wsRaceRoom.on("message", (data) => {
                console.log(`[${raceRoomSlug}] ->`, JSON.stringify(JSON.parse(data)));
            });
            resolve(wsRaceRoom);
        })
            .catch((error) => {
            console.log("Unable to connect to race room:");
            reject(error);
        });
    });
};
const weeklyRaceJob = node_schedule_1.default.scheduleJob(timeToSchedule, () => __awaiter(void 0, void 0, void 0, function* () {
    console.log(`Creating weekly race room...`);
    createRaceRoom(RACETIME_GAME_CATEGORY_SLUG_Z3, weeklyRaceData)
        .then((weeklyRaceRoomSlug) => {
        const raceData = {
            raceRoomUrl: `${RACETIME_BASE_URL}${weeklyRaceRoomSlug}`,
            startTimestamp: Math.floor((Date.now() + weeklyRaceStartOffsetSeconds * 1000) / 1000),
        };
        wsRelay.emit("weeklyRaceRoomCreated", raceData);
        return listenToRaceRoom(weeklyRaceRoomSlug);
    })
        .then((wsRaceRoom) => {
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
        wsRaceRoom.send(JSON.stringify(happyWeeklyMessage), (err) => {
            if (err)
                return console.error(err);
            console.log(`Sent happy weekly message to race room, closing connection...`);
            wsRaceRoom.terminate();
        });
    })
        .catch(console.error);
}));
weeklyRaceJob.on("scheduled", (date) => {
    console.log(`Weekly race room creation scheduled, next invocation: ${date}`);
});
console.log(`Weekly race room creation scheduled, next invocation: ${weeklyRaceJob.nextInvocation()}`);
process.on("SIGINT", function () {
    node_schedule_1.default.gracefulShutdown().then(() => process.exit(0));
});
