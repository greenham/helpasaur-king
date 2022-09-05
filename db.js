const mongoose = require("mongoose");
const ObjectId = require("mongodb").ObjectId;
const { MONGODB_URL } = process.env;

mongoose
  .connect(MONGODB_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("[DB]: Connected!");
  })
  .catch((err) => {
    console.error(`[DB]: Unable to connect to mongodb: ${MONGODB_URL}`);
  });

exports.oid = function (id) {
  return ObjectId(id);
};

exports.Command = require("./models/command");

exports.db = mongoose;
