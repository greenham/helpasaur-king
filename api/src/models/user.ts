import mongoose, { Schema, Document } from "mongoose"
import { IUser } from "@helpasaur/types"

export interface IUserDocument extends IUser, Document {
  _id: mongoose.Types.ObjectId
}

const userSchema = new Schema<IUserDocument>({
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
  twitchBotConfig: {
    /* active is used to determine if the bot should join the channel */
    active: {
      type: Boolean,
      default: false,
    },
    commandsEnabled: {
      type: Boolean,
      default: true,
    },
    commandPrefix: {
      type: String,
      default: "!",
    },
    textCommandCooldown: {
      type: Number,
      default: 10,
    },
    practiceListsEnabled: {
      type: Boolean,
      default: false,
    },
    allowModsToManagePracticeLists: {
      type: Boolean,
      default: false,
    },
    weeklyRaceAlertEnabled: {
      type: Boolean,
      default: false,
    },
    createdAt: { type: Date, default: Date.now },
    lastUpdated: { type: Date, default: Date.now },
  },
})

const User = mongoose.model<IUserDocument>("User", userSchema)

export default User
