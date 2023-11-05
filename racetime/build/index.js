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
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _RaceBot_access;
require("dotenv").config();
const schedule = require("node-schedule");
const axios = require("axios");
const { RACETIME_GAME_CATEGORY_SLUG, RACETIME_BOT_CLIENT_ID, RACETIME_BOT_CLIENT_SECRET, } = process.env;
const packageJson = require("../package.json");
const nmgGoal = "Any% NMG";
//const weeklyRaceInfoUser = "Weekly Community Race - Starts at 3PM Eastern";
const weeklyRaceInfoUser = "TEST - DO NOT JOIN";
const weeklyRaceInfoBot = `Created by HelpasaurKing RaceBot v${packageJson.version}`;
class RaceBot {
    constructor(accessToken) {
        _RaceBot_access.set(this, void 0);
        __classPrivateFieldSet(this, _RaceBot_access, accessToken, "f");
    }
    static initialize() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`Requesting access token...`);
            const response = yield axios({
                method: "POST",
                url: "https://racetime.gg/o/token",
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
            try {
                const response = yield axios({
                    method: "POST",
                    data: raceData,
                    url: `https://racetime.gg/o/${RACETIME_GAME_CATEGORY_SLUG}/startrace`,
                    headers: { Authorization: `Bearer ${__classPrivateFieldGet(this, _RaceBot_access, "f")}` },
                });
                // Responses:
                //   201 Created: If form is valid and race room is succesfully opened, a 201 is returned. The Location header will provide the URL of the opened race room.
                //   422 Unprocessable Entity: If form is invalid, a 422 is returned. The content body (JSON) will contain an array of errors indicating what the problem(s) were.
                if (response.status === 201) {
                    // Handle a successful creation (201 Created) response
                    const locationHeader = response.headers.location;
                    console.log("Race room created. Location:", locationHeader);
                    return locationHeader;
                }
                else if (response.status === 422) {
                    // Handle an unprocessable entity (422 Unprocessable Entity) response
                    const errors = response.data;
                    console.log("Validation errors:", errors);
                    return false;
                }
                else {
                    // Handle other response statuses or errors here
                    console.log("Received an unexpected response:", response.status);
                    return false;
                }
            }
            catch (err) {
                console.error(err);
                return false;
            }
        });
    }
}
_RaceBot_access = new WeakMap();
// Happy Weekly (room opens 30 minutes before race starts)
let timeToSchedule = {
    dayOfWeek: 0,
    hour: 9,
    minute: 5,
    tz: "America/Los_Angeles",
};
// !!!!!!!!!!!!!!!!! DEBUG ONLY !!!!!!!!!!!!!!!!!!!!!
// timeToSchedule.dayOfWeek = 2;
// timeToSchedule.hour = 18;
// timeToSchedule.minute = 19;
/////////////////////////////////////////////////////
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
const weeklyRaceJob = schedule.scheduleJob(timeToSchedule, () => __awaiter(void 0, void 0, void 0, function* () {
    console.log(`Creating weekly race room...`);
    const racebot = yield RaceBot.initialize();
    const raceResult = yield racebot.startRace(weeklyRaceData);
    if (!raceResult) {
        console.error(`Unable to create weekly race room!`);
        return;
    }
    // @TODO Get this event to discord somehow? Or should it just be listening for the room creation itself?
}));
console.log(`Weekly race room creation scheduled, next invocation: ${weeklyRaceJob.nextInvocation()}`);
