const express = require("express");
const cors = require("cors");
const logger = require("morgan");
const mongoose = require("mongoose");
const routes = require("./routes");
const { MONGODB_URL, PORT } = process.env;

mongoose.connect(MONGODB_URL);
const database = mongoose.connection;

database.on("error", (error) => {
  console.log(error);
});

database.once("connected", async () => {
  console.log("Connected to MongoDB!");
});

const app = express();

app.use(cors());

// Set up logging
app.use(logger("short"));

app.use(routes);

app.listen(PORT, () => {
  console.log(`Helpasaur API Server Started at ${PORT}`);
});

process.on("unhandledRejection", (error) => {
  console.error("Unhandled promise rejection:", error);
});
