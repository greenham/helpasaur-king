import mongoose, { Schema } from "mongoose"
import { ICommandDocument, ICommandModel } from "../types/models"

const CommandSchema = new Schema<ICommandDocument>({
  command: { type: String, required: true, trim: true },
  aliases: [String],
  response: { type: String, required: true, trim: true },
  category: String,
  tags: [String],
  enabled: Boolean,
  deleted: Boolean,
})

CommandSchema.index({ command: 1 }, { unique: true })
CommandSchema.index({ aliases: 1 })

CommandSchema.statics.findByNameOrAlias = async function (command: string) {
  return await this.findOne({
    $or: [{ command }, { aliases: command }],
    deleted: { $ne: true },
  })
}

CommandSchema.statics.isUnique = async function (
  command: string,
  aliases?: string[]
) {
  // Ensure command name uniqueness
  const model = this as unknown as ICommandModel
  let existingCommand = await model.findByNameOrAlias(command)
  if (existingCommand) {
    return false
  }

  if (aliases && aliases.length > 0) {
    // Ensure alias uniqueness
    existingCommand = await this.findOne({
      $or: [{ command: { $in: aliases } }, { aliases: { $in: aliases } }],
      deleted: { $ne: true },
    })
    if (existingCommand) {
      return false
    }
  }

  return true
}

export default mongoose.model<ICommandDocument, ICommandModel>(
  "Command",
  CommandSchema
)
