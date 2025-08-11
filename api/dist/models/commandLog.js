"use strict";
const mongoose = require("mongoose");
const CommandLog = new mongoose.Schema({
    createdAt: { type: Date, default: Date.now },
    command: String,
    alias: String,
    source: String,
    username: String,
    metadata: {},
});
module.exports = mongoose.model("CommandLog", CommandLog);
//# sourceMappingURL=commandLog.js.map