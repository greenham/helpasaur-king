import mongoose, { Schema } from "mongoose"
import { IPracListsDocument } from "../types/models"

const PracListsSchema = new Schema<IPracListsDocument>({
  twitchUserId: { type: String, required: true },
  name: { type: String, default: "default" },
  entries: [String],
})

export default mongoose.model<IPracListsDocument>("PracLists", PracListsSchema)
