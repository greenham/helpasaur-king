const express = require("express");
const cors = require("cors");
const logger = require("morgan");
const mongoose = require("mongoose");
const { io } = require("socket.io-client");
const routes = require("./routes");
const {
  MONGODB_URL,
  PORT,
  API_CORS_ORIGINS_WHITELIST,
  WEBSOCKET_RELAY_SERVER,
} = process.env;
const packageJson = require("../package.json");

mongoose.connect(MONGODB_URL);
const database = mongoose.connection;

database.on("error", (error) => {
  console.log(error);
});

database.once("connected", async () => {
  console.log("Connected to MongoDB!");
});

// Connect to websocket relay to communicate with other services
const wsRelay = io(WEBSOCKET_RELAY_SERVER, {
  query: { clientId: `${packageJson.name} v${packageJson.version}` },
});
console.log(
  `Connecting to websocket relay server on port ${WEBSOCKET_RELAY_SERVER}...`
);
wsRelay.on("connect_error", (err) => {
  console.log(`Connection error!`);
  console.log(err);
});
wsRelay.on("connect", () => {
  console.log(`✅ Connected! Socket ID: ${wsRelay.id}`);
});

const app = express();

const originWhitelist = API_CORS_ORIGINS_WHITELIST.split(",");
app.use(cors({ origin: originWhitelist, credentials: true }));

// Set up logging
app.use(logger("short"));

app.wsRelay = wsRelay;

app.use(routes);

app.use(function (err, req, res, next) {
  if (err.name === "UnauthorizedError") {
    res.status(401).json({ error: err.name + ": " + err.message });
  } else {
    next(err);
  }
});

app.listen(PORT, () => {
  console.log(`Helpasaur API Server Started at ${PORT}`);
});

process.on("unhandledRejection", (error) => {
  console.error("Unhandled promise rejection:", error);
});
