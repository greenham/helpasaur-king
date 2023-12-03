const express = require("express");
const cors = require("cors");
const logger = require("morgan");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const routes = require("./routes");
const { MONGODB_URL, PORT, API_CORS_ORIGINS_WHITELIST } = process.env;

mongoose.connect(MONGODB_URL);
const database = mongoose.connection;

database.on("error", (error) => {
  console.log(error);
});

database.once("connected", async () => {
  console.log("Connected to MongoDB!");
});

const app = express();

const originWhitelist = API_CORS_ORIGINS_WHITELIST.split(",");
app.use(cors({ origin: originWhitelist, credentials: true }));

// Set up logging
app.use(logger("short"));

app.use(cookieParser());
app.use(routes);

app.listen(PORT, () => {
  console.log(`Helpasaur API Server Started at ${PORT}`);
});

process.on("unhandledRejection", (error) => {
  console.error("Unhandled promise rejection:", error);
});
