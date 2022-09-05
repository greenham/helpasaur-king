const mongoose = require("mongoose");

const Command = new mongoose.Schema({
  command: String,
  aliases: [String],
  response: String,
  category: String,
  enabled: Boolean,
  deleted: Boolean,
  timesUsed: Number,
});

Command.methods.used = function () {
  this.$inc("timesUsed", 1).save();
};

module.exports = mongoose.model("Command", Command);
