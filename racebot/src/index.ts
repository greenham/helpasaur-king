import { v4 as uuidv4 } from "uuid"
import schedule from "node-schedule"
import { io } from "socket.io-client"
import WebSocket from "ws"
import express from "express"
import RacetimeBot from "./lib/racetime"
import * as Racetime from "./lib/racetime/types"
import { config } from "./config"

const {
  packageName,
  packageVersion,
  websocketRelayServer,
  racetimeBaseUrl,
  racetimeBotClientId,
  racetimeBotClientSecret,
  racetimeGameCategorySlugZ3,
  racebotHealthPort,
  nodeEnv,
  isProduction,
} = config

const nmgGoal = "Any% NMG"
const weeklyRaceInfoUser = "Weekly Community Race - Starts at 3PM Eastern"
const weeklyRaceInfoBot = ""
const disconnectFromRaceRoomAfterHours = 4

// Configure race room to open 30 minutes before the start time
const weeklyRaceStartOffsetMinutes = 30
const weeklyRaceStartOffsetSeconds = weeklyRaceStartOffsetMinutes * 60
// Weekly starts at Noon Pacific on Sundays
const timeToSchedule = {
  dayOfWeek: 0,
  hour: 11,
  minute: 30,
  tz: "America/Los_Angeles",
}
// !!!!! DEBUG ONLY !!!!! //
// timeToSchedule.dayOfWeek = 5;
// timeToSchedule.hour = 13;
// timeToSchedule.minute = 15;
////////////////////////////

// Connect to websocket relay so we can forward events to other services and listen for commands
const wsRelay = io(websocketRelayServer, {
  query: { clientId: `${packageName} ${packageVersion}` },
})
console.log(`Connecting to websocket relay server: ${websocketRelayServer}...`)
wsRelay.on("connect_error", (err) => {
  console.log(`Connection error!`)
  console.log(err)
})
wsRelay.on("connect", () => {
  console.log(`Connected! Socket ID: ${wsRelay.id}`)
})

const weeklyRaceData: Racetime.NewRaceData = {
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
}

const createRaceRoom = (
  game: string,
  raceData: Racetime.NewRaceData
): Promise<string> => {
  return new Promise((resolve, reject) => {
    RacetimeBot.initialize(racetimeBotClientId, racetimeBotClientSecret)
      .then((racebot) => racebot.startRace(game, raceData))
      .then(resolve)
      .catch((error: any) => {
        console.error(`Unable to create race room!`)
        reject(error)
      })
  })
}

const listenToRaceRoom = (raceRoomSlug: string): Promise<WebSocket> => {
  return new Promise((resolve, reject) => {
    RacetimeBot.initialize(racetimeBotClientId, racetimeBotClientSecret)
      .then((racebot) => racebot.connectToRaceRoom(raceRoomSlug))
      .then(resolve)
      .catch((error) => {
        console.log("Unable to connect to race room:")
        reject(error)
      })
  })
}

const scheduleWeeklyRace = () => {
  const weeklyRaceJob = schedule.scheduleJob(timeToSchedule, () => {
    if (!isProduction) {
      console.log(
        `[${new Date().toISOString()}] Weekly race job triggered - skipping race room creation in non-production environment`
      )
      return
    }

    let weeklyRaceRoomSlug = ""

    console.log(`Creating weekly race room...`)
    createRaceRoom(racetimeGameCategorySlugZ3, weeklyRaceData)
      .then((slug) => {
        weeklyRaceRoomSlug = slug
        // Assemble event data to push to the relay (for discord, etc.)
        const raceData = {
          raceRoomUrl: `${racetimeBaseUrl}${slug}`,
          startTimestamp: Math.floor(
            (Date.now() + weeklyRaceStartOffsetSeconds * 1000) / 1000
          ),
        }
        wsRelay.emit("weeklyRaceRoomCreated", raceData)

        // Connect to the race room so we can interact with it
        return listenToRaceRoom(slug)
      })
      .then((wsRaceRoom) => {
        const happyWeeklyMessage: Racetime.MessageAction = {
          action: Racetime.MESSAGE_ACTION,
          data: {
            message: `Happy Weekly! The race will start in ~${weeklyRaceStartOffsetMinutes} minutes. Good luck and have fun!`,
            pinned: false,
            actions: null,
            direct_to: null,
            guid: uuidv4(),
          },
        }
        wsRaceRoom.send(JSON.stringify(happyWeeklyMessage), (err) => {
          if (err) return console.error(err)
          console.log(`Sent happy weekly message to race room!`)
        })

        wsRaceRoom.on("message", (data: string) => {
          const raceRoomMessage: Racetime.IncomingMessage = JSON.parse(data)

          switch (raceRoomMessage.type) {
            case Racetime.CHAT_MESSAGE_TYPE: {
              // Type assertion to specify that raceRoomMessage is of type ChatMessageMessage
              const raceChatMessage =
                raceRoomMessage as Racetime.ChatMessageMessage
              const { message: chatMessage } = raceChatMessage

              console.log(
                `${weeklyRaceRoomSlug} | <${chatMessage.user?.name}>: ${chatMessage.message}`
              )

              // @TODO: Respond to the usual prefixed commands
              break
            }

            case Racetime.RACE_DATA_TYPE: {
              // Type assertion to specify that raceRoomMessage is of type RaceDataMessage
              const raceDataMessage =
                raceRoomMessage as Racetime.RaceDataMessage

              // if the race has ended, disconnect from the websocket
              if (
                ["finished", "cancelled"].includes(
                  raceDataMessage.race.status.value
                )
              ) {
                console.log(
                  `Race has finished (or been cancelled)! Closing websocket connection...`
                )
                wsRaceRoom.terminate()
              }

              break
            }
          }
        })

        setTimeout(
          () => {
            console.log(
              `It's been ${disconnectFromRaceRoomAfterHours} hours, closing websocket connection...`
            )
            wsRaceRoom.terminate()
          },
          1000 * 60 * 60 * disconnectFromRaceRoomAfterHours
        )
      })
      .catch(console.error)
  })

  weeklyRaceJob.on("scheduled", (date) => {
    console.log(`Weekly race room creation scheduled, next invocation: ${date}`)
  })

  console.log(
    `Weekly race room creation scheduled, next invocation: ${weeklyRaceJob.nextInvocation()}`
  )

  // Start health check server
  const healthApp = express()
  healthApp.get("/health", (_req, res) => {
    try {
      res.status(200).json({
        status: "healthy",
        service: "racebot",
        version: packageVersion,
        wsRelayConnected: wsRelay.connected,
        environment: nodeEnv,
        schedulerActive: weeklyRaceJob !== null,
        nextRace: weeklyRaceJob?.nextInvocation() || null,
      })
    } catch (error) {
      console.error("Health check error:", error)
      res.status(503).json({
        status: "unhealthy",
        service: "racebot",
        error: error instanceof Error ? error.message : String(error),
      })
    }
  })

  healthApp.listen(racebotHealthPort, () => {
    console.log(`Health check endpoint available on port ${racebotHealthPort}`)
  })
}

scheduleWeeklyRace()

process.on("SIGINT", function () {
  schedule.gracefulShutdown().then(() => process.exit(0))
})
