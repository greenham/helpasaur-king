const express = require("express")
const cors = require("cors")
const logger = require("morgan")
const mongoose = require("mongoose")
const { io } = require("socket.io-client")
const cookieParser = require("cookie-parser")
const ms = require("ms")
const routes = require("./routes")
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
const trackRequests = (req, res, next) => {
  requestCount++

  // Track errors
  res.on("finish", () => {
    if (res.statusCode >= 400) {
      errorCount++
    }
  })

  next()
}

mongoose.connect(MONGODB_URL)
const database = mongoose.connection

database.on("error", (error) => {
  console.log(error)
})

database.once("connected", () => {
  console.log("Connected to MongoDB!")
})

// Connect to websocket relay to communicate with other services
const wsRelay = io(WEBSOCKET_RELAY_SERVER, {
  query: { clientId: `${packageJson.name} v${packageJson.version}` },
})
console.log(
  `Connecting to websocket relay server on port ${WEBSOCKET_RELAY_SERVER}...`
)
wsRelay.on("connect_error", (err) => {
  console.log(`Connection error!`)
  console.log(err)
})
wsRelay.on("connect", () => {
  console.log(`✅ Connected! Socket ID: ${wsRelay.id}`)
})

const app = express()

// Only allow requests from whitelisted origins
const originWhitelist = API_CORS_ORIGINS_WHITELIST.split(",")
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
app.get("/health", async (req, res) => {
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
  } catch (error) {
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

app.use(function (err, req, res, next) {
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
