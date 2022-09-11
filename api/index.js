require("dotenv").config();

const express = require("express");
const routes = require("./routes");
const logger = require("morgan");
const mongoose = require("mongoose");
const { MONGODB_URL, PORT } = process.env;

mongoose.connect(MONGODB_URL);
const database = mongoose.connection;

database.on("error", (error) => {
  console.log(error);
});

database.once("connected", () => {
  console.log("Database Connected");
});

const app = express();

// Set up logging
app.use(logger("tiny"));

app.use(express.json());
app.use(routes);

app.listen(PORT, () => {
  console.log(`Server Started at ${PORT}`);
});
