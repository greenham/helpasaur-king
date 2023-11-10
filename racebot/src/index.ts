import { v4 as uuidv4 } from "uuid";
import schedule from "node-schedule";
import { io } from "socket.io-client";
import WebSocket from "ws";
import RaceBot, { RaceData, RaceTimeMessage } from "./lib/RaceBot";

const {
  RACETIME_BASE_URL,
  WEBSOCKET_RELAY_SERVER,
  RACETIME_BOT_CLIENT_ID,
  RACETIME_BOT_CLIENT_SECRET,
  RACETIME_GAME_CATEGORY_SLUG_Z3,
} = process.env;

if (
  !RACETIME_BASE_URL ||
  !WEBSOCKET_RELAY_SERVER ||
  !RACETIME_BOT_CLIENT_ID ||
  !RACETIME_BOT_CLIENT_SECRET ||
  !RACETIME_GAME_CATEGORY_SLUG_Z3
) {
  console.error("At least one required environment variable is not set!");
  process.exit(1);
}

const wsRelayServer = String(WEBSOCKET_RELAY_SERVER);
const wsRelay = io(wsRelayServer);
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

// Happy Weekly
// (room opens 30 minutes before race starts)
const weeklyRaceStartOffsetSeconds = 30 * 60;
const timeToSchedule = {
  dayOfWeek: 0,
  hour: 11,
  minute: 30,
  tz: "America/Los_Angeles",
};

const createRaceRoom = (game: string, raceData: RaceData): Promise<string> => {
  return new Promise((resolve, reject) => {
    RaceBot.initialize(RACETIME_BOT_CLIENT_ID, RACETIME_BOT_CLIENT_SECRET)
      .then((racebot) => racebot.startRace(game, raceData))
      .then((raceResult) => {
        resolve(String(raceResult));
      })
      .catch((error: any) => {
        console.error(`Unable to create race room!`);
        reject(error);
      });
  });
};

const listenToRaceRoom = (raceRoomSlug: string): Promise<WebSocket> => {
  return new Promise((resolve, reject) => {
    RaceBot.initialize(RACETIME_BOT_CLIENT_ID, RACETIME_BOT_CLIENT_SECRET)
      .then((racebot) => racebot.connectToRaceRoom(raceRoomSlug))
      .then((wsRaceRoom) => {
        wsRaceRoom.on("message", (data: any) => {
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

const weeklyRaceJob = schedule.scheduleJob(timeToSchedule, async () => {
  console.log(`Creating weekly race room...`);
  createRaceRoom(RACETIME_GAME_CATEGORY_SLUG_Z3, weeklyRaceData)
    .then((weeklyRaceRoomSlug: any) => {
      const raceData = {
        raceRoomUrl: `${RACETIME_BASE_URL}${weeklyRaceRoomSlug}`,
        startTimestamp: Math.floor(
          (Date.now() + weeklyRaceStartOffsetSeconds * 1000) / 1000
        ),
      };
      wsRelay.emit("weeklyRaceRoomCreated", raceData);

      return listenToRaceRoom(weeklyRaceRoomSlug);
    })
    .then((wsRaceRoom) => {
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
      wsRaceRoom.send(JSON.stringify(happyWeeklyMessage), (err) => {
        if (err) return console.error(err);
        console.log(
          `Sent happy weekly message to race room, closing connection...`
        );
        wsRaceRoom.terminate();
      });
    })
    .catch(console.error);
});
weeklyRaceJob.on("scheduled", (date) => {
  console.log(`Weekly race room creation scheduled, next invocation: ${date}`);
});

console.log(
  `Weekly race room creation scheduled, next invocation: ${weeklyRaceJob.nextInvocation()}`
);

process.on("SIGINT", function () {
  schedule.gracefulShutdown().then(() => process.exit(0));
});
