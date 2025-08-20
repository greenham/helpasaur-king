import express, { Application, Request, Response } from "express"
import * as crypto from "crypto"
import { EventEmitter } from "events"
import ms from "ms"
import { Constants } from "../constants"
import { config } from "../config"

const {
  twitchEventsubSecretKey,
  packageVersion,
  nodeEnv,
  twitchEventsubWebhookUrl,
} = config

const {
  TWITCH_MESSAGE_ID,
  TWITCH_MESSAGE_TIMESTAMP,
  TWITCH_MESSAGE_SIGNATURE,
  MESSAGE_TYPE,
  MESSAGE_TYPE_VERIFICATION,
  MESSAGE_TYPE_NOTIFICATION,
  MESSAGE_TYPE_REVOCATION,
} = Constants

export class TwitchEventListener extends EventEmitter {
  private app: Application
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

    this.app.post("/eventsub", (req: Request, res: Response) => {
      this.handleWebhook(req, res)
    })

    // Health check endpoint
    this.app.get("/health", (_req: Request, res: Response) => {
      try {
        const uptimeMs = Date.now() - this.startTime
        res.status(200).json({
          status: "healthy",
          service: "runnerwatcher",
          version: packageVersion,
          port: this.listeningPort || "not started",
          uptime: uptimeMs ? ms(uptimeMs, { long: true }) : "0 ms",
          uptimeMs, // keep raw ms for monitoring tools
          eventsReceived: this.eventsReceived,
          environment: nodeEnv,
          webhookConfigured: !!twitchEventsubWebhookUrl, // just boolean, not the actual URL
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
  }

  listen(port: number): void {
    this.listeningPort = port
    this.app.listen(port, () => {
      console.log(`Twitch EventSub listener running on port ${port}!`)
    })
  }

  handleWebhook(req: Request, res: Response): void {
    const notification = JSON.parse(req.body)
    const messageId = req.header(TWITCH_MESSAGE_ID)
    const messageTimestamp = req.header(TWITCH_MESSAGE_TIMESTAMP)
    const messageSignature = req.header(TWITCH_MESSAGE_SIGNATURE)
    const messageType = req.header(MESSAGE_TYPE)

    // Check signature
    const computedSignature = this.computeSignature(
      messageId!,
      messageTimestamp!,
      req.body
    )
    if (messageSignature !== computedSignature) {
      console.log(`Invalid signature on Twitch EventSub notification!`)
      res.status(403).send("Forbidden")
      return
    }

    // Handle message type
    if (messageType === MESSAGE_TYPE_NOTIFICATION) {
      this.eventsReceived++
      this.emit("notification", notification)
      res.sendStatus(204)
    } else if (messageType === MESSAGE_TYPE_VERIFICATION) {
      res.status(200).send(notification.challenge)
    } else if (messageType === MESSAGE_TYPE_REVOCATION) {
      console.log(`${notification.subscription.type} notifications revoked!`)
      console.log(`reason: ${notification.subscription.status}`)
      console.log(
        `condition: ${JSON.stringify(
          notification.subscription.condition,
          null,
          4
        )}`
      )
      res.sendStatus(204)
    } else {
      console.log(`Unknown message type: ${messageType}`)
      res.sendStatus(204)
    }
  }

  computeSignature(
    messageId: string,
    messageTimestamp: string,
    body: Buffer
  ): string {
    const message = messageId + messageTimestamp + body
    const signature = crypto
      .createHmac("sha256", twitchEventsubSecretKey)
      .update(message)
      .digest("hex")
    return `sha256=${signature}`
  }
}
