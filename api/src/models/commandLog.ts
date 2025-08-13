import mongoose, { Schema, Document } from "mongoose"

export interface ICommandLogDocument extends Document {
  _id: mongoose.Types.ObjectId
  createdAt: Date
  command: string
  alias?: string
  source: string
  username: string
  metadata?: any
}

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
