"use strict";
const mongoose = require("mongoose");
const PracLists = new mongoose.Schema({
    twitchUserId: { type: String, required: true },
    name: { type: String, default: "default" },
    entries: [String],
});
module.exports = mongoose.model("PracLists", PracLists);
//# sourceMappingURL=pracLists.js.map