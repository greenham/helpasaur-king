import express from "express"
import cors from "cors"
import logger from "morgan"
import mongoose from "mongoose"
import { io, Socket } from "socket.io-client"
import cookieParser from "cookie-parser"
import ms from "ms"
import routes from "./routes"

const {
  MONGODB_URL,
  PORT,
  API_CORS_ORIGINS_WHITELIST,
  WEBSOCKET_RELAY_SERVER,
} = process.env
const packageJson = require("../package.json")

// Track API stats
const startTime = Date.now()
let requestCount = 0
let errorCount = 0

// Middleware to track requests
const trackRequests = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  requestCount++

  // Track errors
  res.on("finish", () => {
    if (res.statusCode >= 400) {
      errorCount++
    }
  })

  next()
}

// Extend Express Application type to include wsRelay
declare global {
  namespace Express {
    interface Application {
      wsRelay: Socket
    }
  }
}

mongoose.connect(MONGODB_URL!)
const database = mongoose.connection

database.on("error", (error: Error) => {
  console.log(error)
})

database.once("connected", () => {
  console.log("Connected to MongoDB!")
})

// Connect to websocket relay to communicate with other services
const wsRelay = io(WEBSOCKET_RELAY_SERVER!, {
  query: { clientId: `${packageJson.name} v${packageJson.version}` },
})
console.log(
  `Connecting to websocket relay server on port ${WEBSOCKET_RELAY_SERVER}...`
)
wsRelay.on("connect_error", (err: Error) => {
  console.log(`Connection error!`)
  console.log(err)
})
wsRelay.on("connect", () => {
  console.log(`✅ Connected! Socket ID: ${wsRelay.id}`)
})

const app = express()

// Only allow requests from whitelisted origins
const originWhitelist = API_CORS_ORIGINS_WHITELIST!.split(",")
app.use(cors({ origin: originWhitelist, credentials: true }))

// Set up logging
app.use(logger("short"))

// Track requests
app.use(trackRequests)

// Allow the app to use the websocket relay
app.wsRelay = wsRelay

// Use cookie-parser
app.use(cookieParser())

// Health check endpoint
app.get("/health", async (req: express.Request, res: express.Response) => {
  try {
    const uptimeMs = Date.now() - startTime

    res.status(200).json({
      status: "healthy",
      service: "api",
      version: packageJson.version,
      uptime: ms(uptimeMs, { long: true }),
      uptimeMs: uptimeMs,
      requestCount: requestCount,
      errorCount: errorCount,
      errorRate:
        requestCount > 0
          ? `${((errorCount / requestCount) * 100).toFixed(2)}%`
          : "0%",
      dbConnected: database.readyState === 1,
      websocketConnected: wsRelay.connected,
      environment: process.env.NODE_ENV || "development",
    })
  } catch (error: any) {
    console.error("Health check error:", error)
    res.status(503).json({
      status: "unhealthy",
      service: "api",
      error: error.message,
    })
  }
})

// Set up routes
app.use(routes)

app.use(function (
  err: any,
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  if (err.name === "UnauthorizedError") {
    res.status(401).json({ error: err.name + ": " + err.message })
  } else if (err.code === "permission_denied") {
    res.status(403).send("Forbidden")
  } else {
    next(err)
  }
})

app.listen(PORT, () => {
  console.log(`Helpasaur API Server Started at ${PORT}`)
})

process.on("unhandledRejection", (error) => {
  console.error("Unhandled promise rejection:", error)
})
