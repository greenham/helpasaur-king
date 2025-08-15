import mongoose, { Schema } from "mongoose"
import { IConfigurationDocument } from "../types/models"

const ConfigSchema = new Schema<IConfigurationDocument>({
  id: String,
  config: Schema.Types.Mixed,
})

export default mongoose.model<IConfigurationDocument>("Config", ConfigSchema)
