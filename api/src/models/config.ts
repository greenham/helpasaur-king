import mongoose, { Schema, Document } from "mongoose"
import { IConfiguration } from "@helpasaur/types"

export interface IConfigDocument extends IConfiguration, Document {
  _id: mongoose.Types.ObjectId
}

const ConfigSchema = new Schema<IConfigDocument>({
  id: String,
  config: Schema.Types.Mixed,
})

export default mongoose.model<IConfigDocument>("Config", ConfigSchema)
