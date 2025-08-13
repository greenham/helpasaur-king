import mongoose, { Schema, Document } from "mongoose"

export interface IPracListsDocument extends Document {
  _id: mongoose.Types.ObjectId
  twitchUserId: string
  name: string
  entries: string[]
}

const PracListsSchema = new Schema<IPracListsDocument>({
  twitchUserId: { type: String, required: true },
  name: { type: String, default: "default" },
  entries: [String],
})

export default mongoose.model<IPracListsDocument>("PracLists", PracListsSchema)
