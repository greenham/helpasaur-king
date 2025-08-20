import express, { Request, Response, NextFunction } from "express"
import cors from "cors"
import logger from "morgan"
import mongoose from "mongoose"
import { io, Socket } from "socket.io-client"
import cookieParser from "cookie-parser"
import ms from "ms"
import routes from "./routes"
import { config } from "./config"
const {
  mongodbUrl,
  port,
  corsOriginsWhitelist,
  websocketRelayServer,
  nodeEnv,
  packageName,
  packageVersion,
} = config

// Track API stats
const startTime = Date.now()
let requestCount = 0
let errorCount = 0

// Middleware to track requests
const trackRequests = (req: Request, res: Response, next: NextFunction) => {
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

mongoose.connect(mongodbUrl)
const database = mongoose.connection

database.on("error", (error: Error) => {
  console.log(error)
})

database.once("connected", () => {
  console.log("Connected to MongoDB!")
})

// Connect to websocket relay to communicate with other services
const wsRelay = io(websocketRelayServer, {
  query: { clientId: `${packageName} v${packageVersion}` },
})
console.log(
  `Connecting to websocket relay server on port ${websocketRelayServer}...`
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
app.use(cors({ origin: corsOriginsWhitelist, credentials: true }))

// Set up logging
app.use(logger("short"))

// Track requests
app.use(trackRequests)

// Allow the app to use the websocket relay
app.wsRelay = wsRelay

// Use cookie-parser
app.use(cookieParser())

// Health check endpoint
app.get("/health", async (req: Request, res: Response) => {
  try {
    const uptimeMs = Date.now() - startTime

    res.status(200).json({
      status: "healthy",
      service: "api",
      version: packageVersion,
      uptime: ms(uptimeMs, { long: true }),
      uptimeMs,
      requestCount,
      errorCount,
      errorRate:
        requestCount > 0
          ? `${((errorCount / requestCount) * 100).toFixed(2)}%`
          : "0%",
      dbConnected: database.readyState === 1,
      websocketConnected: wsRelay.connected,
      environment: nodeEnv,
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

app.use(function (err: any, req: Request, res: Response, next: NextFunction) {
  if (err.name === "UnauthorizedError") {
    res.status(401).json({ error: `${err.name}: ${err.message}` })
  } else if (err.code === "permission_denied") {
    res.status(403).send("Forbidden")
  } else {
    next(err)
  }
})

app.listen(port, () => {
  console.log(`Helpasaur API Server Started at ${port}`)
})

process.on("unhandledRejection", (error) => {
  console.error("Unhandled promise rejection:", error)
})
