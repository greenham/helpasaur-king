import express, { Request, Response } from "express"
import * as crypto from "crypto"
import { EventEmitter } from "events"
import ms from "ms"
import * as packageJson from "../../package.json"

const { TWITCH_EVENTSUB_SECRET_KEY } = process.env

import {
  TWITCH_MESSAGE_ID,
  TWITCH_MESSAGE_TIMESTAMP,
  TWITCH_MESSAGE_SIGNATURE,
  MESSAGE_TYPE,
  MESSAGE_TYPE_VERIFICATION,
  MESSAGE_TYPE_NOTIFICATION,
  MESSAGE_TYPE_REVOCATION,
} from "../constants"

interface TwitchNotification {
  challenge?: string
  subscription?: {
    type: string
    [key: string]: any
  }
  event?: {
    broadcaster_user_id: string
    broadcaster_user_login: string
    broadcaster_user_name: string
    [key: string]: any
  }
}

class TwitchEventListener extends EventEmitter {
  private app: express.Application
  private listeningPort: number | null
  private startTime: number
  private eventsReceived: number

  constructor() {
    super()
    this.app = express()
    this.listeningPort = null
    this.startTime = Date.now()
    this.eventsReceived = 0

    // Need raw body for verification
    this.app.use(express.raw({ type: "application/json" }))

    // Health check endpoint
    this.app.get("/health", (_req: Request, res: Response) => {
      try {
        const uptimeMs = Date.now() - this.startTime
        res.status(200).json({
          status: "healthy",
          service: "runnerwatcher",
          version: packageJson.version,
          port: this.listeningPort || "not started",
          uptime: uptimeMs ? ms(uptimeMs, { long: true }) : "0 ms",
          uptimeMs: uptimeMs, // keep raw ms for monitoring tools
          eventsReceived: this.eventsReceived,
          environment: process.env.NODE_ENV || "development",
          webhookConfigured: !!process.env.TWITCH_EVENTSUB_WEBHOOK_URL, // just boolean, not the actual URL
        })
      } catch (error: any) {
        console.error("Health check error:", error)
        res.status(503).json({
          status: "unhealthy",
          service: "runnerwatcher",
          error: error.message,
        })
      }
    })

    this.app.post("/eventsub", (req: Request, res: Response) => {
      const signature = req.get(TWITCH_MESSAGE_SIGNATURE)
      const messageId = req.get(TWITCH_MESSAGE_ID)
      const messageTimestamp = req.get(TWITCH_MESSAGE_TIMESTAMP)

      if (
        !this.verifySignature(
          signature || "",
          messageId || "",
          messageTimestamp || "",
          req.body
        )
      ) {
        res.status(403).send("Forbidden") // Reject requests with invalid signatures
        return
      }

      // Get JSON object from body for processing
      const notification: TwitchNotification = JSON.parse(req.body)
      const messageType = req.get(MESSAGE_TYPE)

      switch (messageType) {
        case MESSAGE_TYPE_VERIFICATION:
          console.log(
            `Received Twitch webhook challenge request, responding with: ${notification.challenge}`
          )

          // Returning a 200 status with the received challenge to complete webhook creation flow
          res.status(200).type("txt").send(notification.challenge)
          break

        case MESSAGE_TYPE_NOTIFICATION:
          console.log(`Received ${messageType} notification`)

          // Emit event for processing
          this.eventsReceived++
          this.emit("notification", notification)

          // Respond with 204 for Twitch
          res.sendStatus(204)
          break

        case MESSAGE_TYPE_REVOCATION:
          console.log(
            `${notification.subscription?.type} notifications revoked!`
          )
          console.log(`reason: ${notification.subscription}`)

          // Respond with 204 for Twitch
          res.sendStatus(204)
          break

        default:
          console.log(`Unknown message type: ${messageType}`)
          res.sendStatus(204)
          break
      }
    })
  }

  private verifySignature(
    signature: string,
    messageId: string,
    messageTimestamp: string,
    body: Buffer
  ): boolean {
    const message = messageId + messageTimestamp + body
    const hmac =
      "sha256=" +
      crypto
        .createHmac("sha256", TWITCH_EVENTSUB_SECRET_KEY || "")
        .update(message)
        .digest("hex")

    return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(signature))
  }

  listen(port: number): void {
    this.listeningPort = port
    this.app.listen(port, () => {
      console.log(`Event listener started on port ${port}`)
    })
  }
}

export default TwitchEventListener
