const schedule = require("node-schedule");
const axios = require("axios");
require("dotenv").config();
const { RACETIME_BOT_CLIENT_ID, RACETIME_BOT_CLIENT_SECRET } = process.env;
let racetimeAccessToken = "";

// Get an access token from racetime
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

// Expecting:
// {
//   "access_token": "<access token>",
//   "expires_in": 36000,
//   "token_type": "Bearer",
//   "scope": "read chat_message race_action"
// }

axios(requestOptions)
  .then((data) => {
    console.log(data.data);
  })
  .catch(console.error);

// Happy Weekly
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

const weeklyRaceJob = schedule.scheduleJob(timeToSchedule, () => {
  console.log(`Creating weekly race room...`);
});
console.log(
  `Weekly race scheduled, next invocation: ${weeklyRaceJob.nextInvocation()}`
);
