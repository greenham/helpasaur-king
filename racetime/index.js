const schedule = require("node-schedule");
const axios = require("axios");
require("dotenv").config();
const { RACETIME_BOT_CLIENT_ID, RACETIME_BOT_CLIENT_SECRET } = process.env;
const packageJson = require("./package.json");

const alttpGameCategory = "alttp";
let racetimeAccessToken = "";

const racetimeTokenEndpoint = "https://racetime.gg/o/token";
const oauthParams = {
  client_id: RACETIME_BOT_CLIENT_ID,
  client_secret: RACETIME_BOT_CLIENT_SECRET,
  grant_type: "client_credentials",
};
const requestOptions = {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  data: oauthParams,
  url: racetimeTokenEndpoint,
};

// Get an access token from racetime
console.log(`Requesting access token...`);
axios(requestOptions)
  .then((response) => {
    console.log(`Received access token.`);
    // {
    //   "access_token": "<access token>",
    //   "expires_in": 36000,
    //   "token_type": "Bearer",
    //   "scope": "read chat_message race_action"
    // }
    racetimeAccessToken = response.data.access_token;
  })
  .catch(console.error);

// Happy Weekly (room opens 30 minutes before race starts)
let timeToSchedule = {
  dayOfWeek: 0,
  hour: 11,
  minute: 30,
  tz: "America/Los_Angeles",
};

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

// !!!!!!!!!!!!!!!!! DEBUG ONLY !!!!!!!!!!!!!!!!!!!!!
// timeToSchedule.dayOfWeek = 2;
// timeToSchedule.hour = 18;
// timeToSchedule.minute = 19;
/////////////////////////////////////////////////////

const weeklyRaceJob = schedule.scheduleJob(timeToSchedule, () => {
  console.log(`Creating weekly race room...`);
  startRace(weeklyRaceData, racetimeAccessToken);
});
console.log(
  `Weekly race room creation scheduled, next invocation: ${weeklyRaceJob.nextInvocation()}`
);

async function startRace(raceData, accessToken) {
  const requestOptions = {
    method: "POST",
    data: raceData,
    url: `https://racetime.gg/o/${alttpGameCategory}/startrace`,
    headers: { Authorization: `Bearer ${accessToken}` },
  };

  // Responses:
  //   201 Created: If form is valid and race room is succesfully opened, a 201 is returned. The Location header will provide the URL of the opened race room.
  //   422 Unprocessable Entity: If form is invalid, a 422 is returned. The content body (JSON) will contain an array of errors indicating what the problem(s) were.

  try {
    const response = await axios(requestOptions);
    switch (response.status) {
      case 201:
        console.log(response.headers.location);
        break;

      case 422:
        console.error(response.data);
        break;

      default:
        console.log(`Unexpected response received`);
    }
  } catch (err) {
    console.error(err);
  }
}
