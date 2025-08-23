import express, { Response, Router } from "express"
import { Socket } from "socket.io-client"
import {
  ApiResult,
  TestEventPayload,
  StreamAlertPayload,
  WeeklyRacePayload,
  ChannelEventPayload,
  RelayEvent,
  TwitchStreamEventType,
} from "@helpasaur/types"
import { AuthenticatedRequest } from "../../types/express"

const router: Router = express.Router()

declare global {
  namespace Express {
    interface Application {
      wsRelay: Socket
    }
  }
}

router.post("/trigger", (req: AuthenticatedRequest, res: Response) => {
  try {
    const { eventType, payload } = req.body as TestEventPayload

    if (!eventType || !payload) {
      return res.status(400).json({
        result: ApiResult.ERROR,
        message: "Missing eventType or payload",
      })
    }

    const wsRelay = req.app.wsRelay

    if (!wsRelay || !wsRelay.connected) {
      return res.status(503).json({
        result: ApiResult.ERROR,
        message: "WebSocket relay is not connected",
      })
    }

    interface StreamAlertTestPayload {
      streamEventType: TwitchStreamEventType
      userId: string
      userLogin: string
      displayName: string
      gameId: string
      gameName: string
      title: string
      startedAt: string
      thumbnail: string
      isMature: boolean
      profileImage: string
    }

    // Route to appropriate relay event
    switch (eventType) {
      case RelayEvent.STREAM_ALERT: {
        const testPayload = payload as unknown as StreamAlertTestPayload
        // For stream alerts, check if payload specifies the specific event type
        const streamPayload: StreamAlertPayload = {
          eventType: testPayload.streamEventType as TwitchStreamEventType,
          id: String(Date.now()),
          user_id: (testPayload.userId as string) || "123456789",
          user_login: (testPayload.userLogin as string) || "greenham",
          user_name: (testPayload.displayName as string) || "greenHam",
          game_id: (testPayload.gameId as string) || "9435",
          game_name:
            (testPayload.gameName as string) ||
            "The Legend of Zelda: A Link to the Past",
          type: "live",
          title: (testPayload.title as string) || "Testing ALttP",
          viewer_count: 100,
          started_at:
            (testPayload.startedAt as string) || new Date().toISOString(),
          language: "other",
          thumbnail_url:
            (testPayload.thumbnail as string) ||
            "https://placedog.net/{width}/{height}",
          tag_ids: [],
          tags: [],
          is_mature: (testPayload.isMature as boolean) || false,
          user: {
            id: (testPayload.userId as string) || "123456789",
            login: (testPayload.userLogin as string) || "greenham",
            display_name: (testPayload.displayName as string) || "greenHam",
            type: "",
            broadcaster_type: "affiliate",
            description: "Test stream for Helpasaur King",
            profile_image_url:
              (testPayload.profileImage as string) ||
              "https://placedog.net/300/300",
            offline_image_url: "",
            view_count: 1000,
            created_at: new Date().toISOString(),
          },
        }
        wsRelay.emit(RelayEvent.STREAM_ALERT, streamPayload)
        break
      }

      case RelayEvent.WEEKLY_RACE_ROOM_CREATED: {
        const racePayload: WeeklyRacePayload = {
          raceRoomUrl:
            (payload.raceRoomUrl as string) ||
            "https://racetime.gg/alttp/test-race-123",
          startTimestamp:
            (payload.startTimestamp as number) ||
            Math.floor((Date.now() + 3600 * 1000) / 1000), // 1 hour from now
        }
        wsRelay.emit(RelayEvent.WEEKLY_RACE_ROOM_CREATED, racePayload)
        break
      }

      case RelayEvent.JOIN_CHANNEL:
      case RelayEvent.LEAVE_CHANNEL: {
        const channelPayload: ChannelEventPayload = {
          action: eventType === RelayEvent.JOIN_CHANNEL ? "join" : "leave",
          channel: (payload.channel as string) || "#greenham",
          userId: payload.userId as string,
          displayName: (payload.displayName as string) || "greenHam",
        }
        wsRelay.emit(eventType, channelPayload)
        break
      }

      default:
        return res.status(400).json({
          result: ApiResult.ERROR,
          message: `Unknown event type: ${eventType}`,
        })
    }

    console.log(`[TEST EVENT] Triggered ${eventType} event`, payload)

    res.json({
      result: ApiResult.SUCCESS,
      message: `Test event ${eventType} triggered successfully`,
      data: { eventType, payload },
    })
  } catch (error) {
    console.error("Error triggering test event:", error)
    res.status(500).json({
      result: ApiResult.ERROR,
      message: "Failed to trigger test event",
      error: error instanceof Error ? error.message : "Unknown error",
    })
  }
})

export default router
