import express, { Response, Router } from "express"
import { Socket } from "socket.io-client"
import {
  ApiResult,
  TestEventPayload,
  StreamAlertPayload,
  WeeklyRacePayload,
  TwitchBotChannelActionType,
  TwitchBotChannelActionPayload,
  RelayEvent,
  TwitchStreamEventType,
  TwitchStreamOnlineType,
  TwitchBotConfig,
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

const eventActionMap = new Map<RelayEvent, TwitchBotChannelActionType>([
  [RelayEvent.JOIN_TWITCH_CHANNEL, TwitchBotChannelActionType.JOIN],
  [RelayEvent.LEAVE_TWITCH_CHANNEL, TwitchBotChannelActionType.LEAVE],
  [
    RelayEvent.TWITCH_BOT_CONFIG_UPDATED,
    TwitchBotChannelActionType.CONFIG_UPDATED,
  ],
])

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
      thumbnail: string
      isMature: boolean
      profileImage: string
    }

    // Route to appropriate relay event
    switch (eventType) {
      case RelayEvent.STREAM_ALERT: {
        const testPayload = payload as unknown as StreamAlertTestPayload
        const currentTime = new Date().toISOString()
        const streamPayload: StreamAlertPayload = {
          eventType: testPayload.streamEventType,
          id: String(Date.now()),
          user_id: testPayload.userId,
          user_login: testPayload.userLogin,
          user_name: testPayload.displayName,
          game_id: testPayload.gameId,
          game_name: testPayload.gameName,
          type: TwitchStreamOnlineType.LIVE,
          title: testPayload.title,
          viewer_count: 100,
          started_at: currentTime,
          language: "other",
          thumbnail_url: testPayload.thumbnail,
          tag_ids: [],
          tags: [],
          is_mature: testPayload.isMature,
          user: {
            id: testPayload.userId,
            login: testPayload.userLogin,
            display_name: testPayload.displayName,
            type: "",
            broadcaster_type: "affiliate",
            description: "Test stream for Helpasaur King",
            profile_image_url: testPayload.profileImage,
            offline_image_url: "",
            view_count: 1000,
            created_at: currentTime,
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

      case RelayEvent.JOIN_TWITCH_CHANNEL:
      case RelayEvent.LEAVE_TWITCH_CHANNEL:
      case RelayEvent.TWITCH_BOT_CONFIG_UPDATED: {
        const action = eventActionMap.get(eventType)
        if (!action) {
          return res.status(400).json({
            result: ApiResult.ERROR,
            message: `No corresponding TwitchBotChannelActionType found for ${eventType}`,
          })
        }
        const channelPayload: TwitchBotChannelActionPayload = {
          action,
          channel: payload.channel as string,
        }
        if (eventType === RelayEvent.TWITCH_BOT_CONFIG_UPDATED) {
          const config = {
            ...(payload.config as Partial<TwitchBotConfig>),
            createdAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
          }
          const channelPayloadWithConfig = {
            ...channelPayload,
            config,
          }
          wsRelay.emit(eventType, channelPayloadWithConfig)
        } else {
          wsRelay.emit(eventType, channelPayload)
        }
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
