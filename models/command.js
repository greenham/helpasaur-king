const mongoose = require("mongoose");

const Command = new mongoose.Schema({
  command: String,
  aliases: [String],
  response: String,
  category: String,
  enabled: Boolean,
  deleted: Boolean,
});

module.exports = mongoose.model("Command", Command);
