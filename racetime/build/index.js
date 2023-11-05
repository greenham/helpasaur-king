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
            console.log(`Received access token.`);
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
                switch (response.status) {
                    case 201:
                        return response.headers.location;
                    case 422:
                        console.error(response.data);
                        return false;
                    default:
                        console.log(`Unexpected response received`);
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
    hour: 11,
    minute: 30,
    tz: "America/Los_Angeles",
};
// !!!!!!!!!!!!!!!!! DEBUG ONLY !!!!!!!!!!!!!!!!!!!!!
// timeToSchedule.dayOfWeek = 2;
// timeToSchedule.hour = 18;
// timeToSchedule.minute = 19;
/////////////////////////////////////////////////////
// goal: A string indicating a goal name. Goals are listed in the category detail endpoint.
// custom_goal: A string indicating a custom goal name.
//     Note that goal and custom_goal are mutually exclusive. Exactly one of these fields is required, and the other must be omitted.
// team_race: Boolean, initiates a team race instead of a regular one.
// invitational: Boolean, sets the race room to be invite-only if enabled.
// unlisted: Boolean, sets the race room to be unlised if enabled. Only allowed if the category supports unlisted rooms.
// info_user: String, giving useful information for race entrants, e.g. "Start at 10:00 PST". Can be edited by race monitors.
// info_bot: String, giving useful information for race entrants, e.g. a seed URL. Can only be edited by bots.
// require_even_teams: Boolean, requires all teams to have the same number of entrants before the race can start. Only applicable if team_race is true.
// start_delay: Integer (10-60), number of seconds the countdown should run for. Required.
// time_limit: Integer (1-72), maximum number of hours the race is allowed to run for. Required.
// time_limit_auto_complete: Boolean, changes race behaviour if everyone forfiets (race is considered completed/recordable instead of cancelled).
// streaming_required: Boolean, indicates if race entrants must have a live stream to race. If not supplied, the category's default streaming rules are applied. If the category does not allow streaming rules to be overridden, this field is ignored.
// auto_start: Boolean, if true then the race will start as soon as everyone is ready. If false, it must be force-started.
// allow_comments: Boolean, allows entrants to add a comment to their result when finished.
// hide_comments: Boolean, causes comments to be hidden until the race is finished. Only applicable if allow_comments is true.
// allow_prerace_chat: Boolean, allows users to chat before the race begins (doesn't affect race monitors or moderators).
// allow_midrace_chat: Boolean, allows users to chat while the race is ongoing (doesn't affect race monitors or moderators).
// allow_non_entrant_chat: Boolean, allow users who are not entered in the race to chat (doesn't affect race monitors or moderators).
// chat_message_delay: Integer (0-90), number of seconds to hold a message for before displaying it (doesn't affect race monitors or moderators). Required.
const weeklyRaceData = {
    goal: "Any% NMG",
    info_user: "Weekly Community Race - Starts at 3PM Eastern",
    info_bot: `Created by HelpasaurKing RaceBot v${packageJson.version}`,
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
    const raceResult = racebot.startRace(weeklyRaceData);
    if (!raceResult) {
        console.log(`Unable to create weekly race room!`);
        return;
    }
    // @TODO Get this event to discord somehow? Or should it just be listening for the room creation itself?
    console.log(`Weekly race room created: ${raceResult}`);
}));
console.log(`Weekly race room creation scheduled, next invocation: ${weeklyRaceJob.nextInvocation()}`);
