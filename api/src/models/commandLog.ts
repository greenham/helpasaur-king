import mongoose, { Schema } from "mongoose"
import { ICommandLogDocument } from "../types/models"

const CommandLogSchema = new Schema<ICommandLogDocument>({
  createdAt: { type: Date, default: Date.now },
  command: String,
  alias: String,
  source: String,
  username: String,
  metadata: {},
})

export default mongoose.model<ICommandLogDocument>(
  "CommandLog",
  CommandLogSchema
)
