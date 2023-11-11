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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const uuid_1 = require("uuid");
const node_schedule_1 = __importDefault(require("node-schedule"));
const socket_io_client_1 = require("socket.io-client");
const racetime_1 = __importDefault(require("./lib/racetime"));
const Racetime = __importStar(require("./lib/racetime/types"));
const requiredEnvVariables = [
    "WEBSOCKET_RELAY_SERVER",
    "RACETIME_BASE_URL",
    "RACETIME_WSS_URL",
    "RACETIME_BOT_CLIENT_ID",
    "RACETIME_BOT_CLIENT_SECRET",
    "RACETIME_GAME_CATEGORY_SLUG_Z3",
];
const config = {};
// Extract values from process.env and check for existence
requiredEnvVariables.forEach((variable) => {
    if (!process.env[variable]) {
        console.error(`Required environment variable ${variable} is not set!`);
        process.exit(1);
    }
    config[variable] = process.env[variable];
});
const nmgGoal = "Any% NMG";
//const weeklyRaceInfoUser = "Weekly Community Race - Starts at 3PM Eastern";
const weeklyRaceInfoUser = "!!! TEST RACE !!!";
const weeklyRaceInfoBot = "";
// Configure race room to open 30 minutes before the start time
const weeklyRaceStartOffsetMinutes = 30;
const weeklyRaceStartOffsetSeconds = weeklyRaceStartOffsetMinutes * 60;
// Weekly starts at Noon Pacific on Sundays
const timeToSchedule = {
    dayOfWeek: 0,
    hour: 11,
    minute: 30,
    tz: "America/Los_Angeles",
};
// !!!!! DEBUG ONLY !!!!! //
// timeToSchedule.dayOfWeek = 5;
// timeToSchedule.hour = 13;
// timeToSchedule.minute = 15;
////////////////////////////
// Connect to websocket relay so we can forward events to other services and listen for commands
const wsRelayServer = String(config.WEBSOCKET_RELAY_SERVER);
const wsRelay = (0, socket_io_client_1.io)(wsRelayServer);
console.log(`Connecting to websocket relay server: ${wsRelayServer}...`);
wsRelay.on("connect_error", (err) => {
    console.log(`Connection error!`);
    console.log(err);
});
wsRelay.on("connect", () => {
    console.log(`Connected! Socket ID: ${wsRelay.id}`);
});
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
const createRaceRoom = (game, raceData) => {
    return new Promise((resolve, reject) => {
        racetime_1.default.initialize(config.RACETIME_BOT_CLIENT_ID, config.RACETIME_BOT_CLIENT_SECRET)
            .then((racebot) => racebot.startRace(game, raceData))
            .then(resolve)
            .catch((error) => {
            console.error(`Unable to create race room!`);
            reject(error);
        });
    });
};
const listenToRaceRoom = (raceRoomSlug) => {
    return new Promise((resolve, reject) => {
        racetime_1.default.initialize(config.RACETIME_BOT_CLIENT_ID, config.RACETIME_BOT_CLIENT_SECRET)
            .then((racebot) => racebot.connectToRaceRoom(raceRoomSlug))
            .then(resolve)
            .catch((error) => {
            console.log("Unable to connect to race room:");
            reject(error);
        });
    });
};
const weeklyRaceJob = node_schedule_1.default.scheduleJob(timeToSchedule, () => {
    let weeklyRaceRoomSlug = "";
    console.log(`Creating weekly race room...`);
    createRaceRoom(config.RACETIME_GAME_CATEGORY_SLUG_Z3, weeklyRaceData)
        .then((slug) => {
        weeklyRaceRoomSlug = slug;
        // Assemble event data to push to the relay (for discord, etc.)
        const raceData = {
            raceRoomUrl: `${config.RACETIME_BASE_URL}${slug}`,
            startTimestamp: Math.floor((Date.now() + weeklyRaceStartOffsetSeconds * 1000) / 1000),
        };
        wsRelay.emit("weeklyRaceRoomCreated", raceData);
        // Connect to the race room so we can interact with it
        return listenToRaceRoom(slug);
    })
        .then((wsRaceRoom) => {
        const happyWeeklyMessage = {
            action: Racetime.MESSAGE_ACTION,
            data: {
                message: `Happy Weekly! The race will start in ~${weeklyRaceStartOffsetMinutes} minutes. Good luck and have fun!`,
                pinned: false,
                actions: null,
                direct_to: null,
                guid: (0, uuid_1.v4)(),
            },
        };
        wsRaceRoom.send(JSON.stringify(happyWeeklyMessage), (err) => {
            if (err)
                return console.error(err);
            console.log(`Sent happy weekly message to race room!`);
        });
        wsRaceRoom.on("message", (data) => {
            const raceRoomMessage = JSON.parse(data);
            console.log(`Received message from [${weeklyRaceRoomSlug}]`, raceRoomMessage);
            switch (raceRoomMessage.type) {
                case Racetime.RACE_DATA_TYPE:
                    // Type assertion to specify that raceRoomMessage is of type RaceDataMessage
                    const raceDataMessage = raceRoomMessage;
                    // if the race has ended, disconnect from the websocket
                    if (["finished", "cancelled"].includes(raceDataMessage.race.status.value)) {
                        console.log(`Race has finished (or been cancelled)! Closing websocket connection...`);
                        wsRaceRoom.terminate();
                    }
                    break;
            }
        });
    })
        .catch(console.error);
});
weeklyRaceJob.on("scheduled", (date) => {
    console.log(`Weekly race room creation scheduled, next invocation: ${date}`);
});
console.log(`Weekly race room creation scheduled, next invocation: ${weeklyRaceJob.nextInvocation()}`);
process.on("SIGINT", function () {
    node_schedule_1.default.gracefulShutdown().then(() => process.exit(0));
});
