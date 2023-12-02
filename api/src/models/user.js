const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  twitchUserData: {
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
    auth: {
      access_token: {
        type: String,
      },
      expires_at: {
        type: Number,
      },
      refresh_token: {
        type: String,
      },
      scope: {
        type: [String],
      },
      token_type: {
        type: String,
      },
    },
  },
  permissions: {
    type: [String],
    default: [],
  },
  lastLogin: {
    type: Date,
    default: Date.now(),
  },
});

const User = mongoose.model("User", userSchema);

module.exports = User;
