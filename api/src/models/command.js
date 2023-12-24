const mongoose = require("mongoose");

const Command = new mongoose.Schema({
  command: String,
  aliases: [String],
  response: String,
  category: String,
  enabled: Boolean,
  deleted: Boolean,
});

Command.index({ command: 1 }, { unique: true });
Command.index({ aliases: 1 });

Command.statics.findByNameOrAlias = async function (command) {
  return await this.findOne({
    $or: [{ command: command }, { aliases: command }],
    deleted: { $ne: true },
  });
};

Command.statics.isUnique = async function (command, aliases) {
  // Ensure command name uniqueness
  let existingCommand = await this.findByNameOrAlias(command);
  if (existingCommand) {
    return false;
  }

  if (aliases && aliases.length > 0) {
    // Ensure alias uniqueness
    existingCommand = await this.findOne({
      $or: [{ command: { $in: aliases } }, { aliases: { $in: aliases } }],
      deleted: { $ne: true },
    });
    if (existingCommand) {
      return false;
    }
  }

  return true;
};

module.exports = mongoose.model("Command", Command);
