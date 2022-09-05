const mongoose = require("mongoose");

const Config = new mongoose.Schema({
  id: String,
  config: mongoose.Schema.Types.Mixed,
});

module.exports = mongoose.model("Config", Config);
