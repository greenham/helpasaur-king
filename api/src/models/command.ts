import mongoose, { Schema, Document, Model } from "mongoose"
import { ICommand } from "@helpasaur/types"

export interface ICommandDocument extends ICommand, Document {
  _id: mongoose.Types.ObjectId
}

interface ICommandModel extends Model<ICommandDocument> {
  findByNameOrAlias(command: string): Promise<ICommandDocument | null>
  isUnique(command: string, aliases?: string[]): Promise<boolean>
}

const CommandSchema = new Schema<ICommandDocument>({
  command: String,
  aliases: [String],
  response: String,
  category: String,
  enabled: Boolean,
  deleted: Boolean,
})

CommandSchema.index({ command: 1 }, { unique: true })
CommandSchema.index({ aliases: 1 })

CommandSchema.statics.findByNameOrAlias = async function (command: string) {
  return await this.findOne({
    $or: [{ command: command }, { aliases: command }],
    deleted: { $ne: true },
  })
}

CommandSchema.statics.isUnique = async function (
  command: string,
  aliases?: string[]
) {
  // Ensure command name uniqueness
  const model = this as any as ICommandModel
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
