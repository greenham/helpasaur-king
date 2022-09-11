const express = require("express");
const logger = require("morgan");
const mongoose = require("mongoose");
const routes = require("./routes");
const { MONGODB_URL, PORT } = process.env;

mongoose.connect(MONGODB_URL);
const database = mongoose.connection;

database.on("error", (error) => {
  console.log(error);
});

database.once("connected", () => {
  console.log("Connected to MongoDB!");
});

const app = express();

// Set up logging
app.use(logger("tiny"));

app.use(express.json());
app.use(routes);

app.listen(PORT, () => {
  console.log(`Helpasaur API Server Started at ${PORT}`);
});
