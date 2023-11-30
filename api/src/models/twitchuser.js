const mongoose = require("mongoose");

const twitchUserSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
  },
  login: {
    type: String,
    required: true,
  },
  display_name: {
    type: String,
    required: true,
  },
  type: {
    type: String,
  },
  broadcaster_type: {
    type: String,
  },
  description: {
    type: String,
  },
  profile_image_url: {
    type: String,
  },
  offline_image_url: {
    type: String,
  },
  view_count: {
    type: Number,
  },
  created_at: {
    type: Date,
  },
  lastLogin: {
    type: Date,
    default: Date.now(),
  },
  isAdmin: {
    type: Boolean,
    default: false,
  },
  authCode: {
    type: String,
  },
});

const TwitchUser = mongoose.model("TwitchUser", twitchUserSchema);

module.exports = TwitchUser;
