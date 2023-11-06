import axios, { AxiosError } from "axios";
import WebSocket from "ws";
import { v4 as uuidv4 } from "uuid";
import schedule from "node-schedule";

require("dotenv").config();

const {
  RACETIME_GAME_CATEGORY_SLUG,
  RACETIME_BOT_CLIENT_ID,
  RACETIME_BOT_CLIENT_SECRET,
} = process.env;

const nmgGoal = "Any% NMG";
const weeklyRaceInfoUser = "Weekly Community Race - Starts at 3PM Eastern";
const weeklyRaceInfoBot = "";

type RaceData = {
  goal: string; // A string indicating a goal name.
  custom_goal?: string; // A string indicating a custom goal name.
  team_race?: boolean; // Boolean, initiates a team race instead of a regular one.
  invitational?: boolean; // Boolean, sets the race room to be invite-only if enabled.
  unlisted?: boolean; // Boolean, sets the race room to be unlisted if enabled. Only allowed if the category supports unlisted rooms.
  info_user?: string; // String, giving useful information for race entrants. Can be edited by race monitors.
  info_bot?: string; // String, giving useful information for race entrants. Can only be edited by bots.
  require_even_teams?: boolean; // Boolean, requires all teams to have the same number of entrants before the race can start. Only applicable if team_race is true.
  start_delay: number; // Integer (10-60), number of seconds the countdown should run for. Required.
  time_limit: number; // Integer (1-72), maximum number of hours the race is allowed to run for. Required.
  time_limit_auto_complete?: boolean; // Boolean, changes race behavior if everyone forfeits (race is considered completed/recordable instead of canceled).
  streaming_required?: boolean; // Boolean, indicates if race entrants must have a live stream to race. If not supplied, the category's default streaming rules are applied. If the category does not allow streaming rules to be overridden, this field is ignored.
  auto_start?: boolean; // Boolean, if true then the race will start as soon as everyone is ready. If false, it must be force-started.
  allow_comments?: boolean; // Boolean, allows entrants to add a comment to their result when finished.
  hide_comments?: boolean; // Boolean, causes comments to be hidden until the race is finished. Only applicable if allow_comments is true.
  allow_prerace_chat?: boolean; // Boolean, allows users to chat before the race begins (doesn't affect race monitors or moderators).
  allow_midrace_chat?: boolean; // Boolean, allows users to chat while the race is ongoing (doesn't affect race monitors or moderators).
  allow_non_entrant_chat?: boolean; // Boolean, allow users who are not entered in the race to chat (doesn't affect race monitors or moderators).
  chat_message_delay: number; // Integer (0-90), number of seconds to hold a message for before displaying it (doesn't affect race monitors or moderators). Required.
};

type RaceTimeMessage = {
  action: "message";
  data: {
    message: string;
    pinned: boolean;
    actions: object | null;
    direct_to: string | null;
    guid: string;
  };
};

const weeklyRaceData: RaceData = {
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
  accessToken: string;

  private constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  static async initialize() {
    console.log(`Requesting access token...`);
    const response = await axios({
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
  }

  async startRace(raceData: RaceData) {
    // Responses:
    //   201 Created: If form is valid and race room is succesfully opened, a 201 is returned. The Location header will provide the URL of the opened race room.
    //   422 Unprocessable Entity: If form is invalid, a 422 is returned. The content body (JSON) will contain an array of errors indicating what the problem(s) were.

    try {
      const response = await axios({
        method: "POST",
        data: raceData,
        url: `https://racetime.gg/o/${RACETIME_GAME_CATEGORY_SLUG}/startrace`,
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
      } else {
        // Handle other response statuses or errors here
        console.log("Received an unexpected response:", response.status);
        return false;
      }
    } catch (error: any) {
      if (error instanceof AxiosError) {
        if (error.response) {
          if (error.response.status === 422) {
            // Handle an unprocessable entity (422 Unprocessable Entity) response
            const errors = error.response.data;
            console.log("Validation errors:", errors);
          } else {
            console.log(
              "Received an unexpected response:",
              error.response.status
            );
          }
        } else if (error.request) {
          // The request was made but no response was received
          // `error.request` is an instance of http.ClientRequest
          console.log(error.request);
        } else {
          // Something happened in setting up the request that triggered an Error
          console.log("Error", error.message);
        }
        console.log(error.config);
      } else {
        console.log("Caught exception outside of Axios:", error);
      }

      return false;
    }
  }

  connectToRaceRoom(raceRoom: string) {
    return new Promise((resolve, reject) => {
      // get websocket bot url via API
      console.log("Fetching race details...");
      axios
        .get(`https://racetime.gg${raceRoom}/data`)
        .then((response) => {
          console.log("Race details:", response.data);
          const raceData = response.data;

          if (!raceData.websocket_bot_url) {
            reject("No websocket bot URL in response data");
          }

          // connect to websocket
          console.log("Connecting to websocket:", raceData.websocket_bot_url);
          const ws = new WebSocket(
            `https://racetime.gg${raceData.websocket_bot_url}?token=${this.accessToken}`
          );
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

const weeklyRaceJob = schedule.scheduleJob(timeToSchedule, async () => {
  console.log(`Creating weekly race room...`);
  const racebot = await RaceBot.initialize();
  const raceResult = await racebot.startRace(weeklyRaceData);
  if (!raceResult) {
    console.error(`Unable to create weekly race room!`);
    return;
  }

  // raceResult will have /<category>/<room-slug>

  racebot
    .connectToRaceRoom(raceResult)
    .then((raceRoomWebsocket: any) => {
      raceRoomWebsocket.on("message", function message(data: any) {
        console.log("received: %s", JSON.parse(data));
      });

      const happyWeeklyMessage: RaceTimeMessage = {
        action: "message",
        data: {
          message: "Happy Weekly!",
          pinned: false,
          actions: null,
          direct_to: null,
          guid: uuidv4(),
        },
      };
      raceRoomWebsocket.send(JSON.stringify(happyWeeklyMessage));
    })
    .catch((error) => {
      console.log("Unable to connect to race room:", error);
    });
});
console.log(
  `Weekly race room creation scheduled, next invocation: ${weeklyRaceJob.nextInvocation()}`
);
