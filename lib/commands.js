const { Command } = require("../db");

function get(command) {
  return Command.findOne({
    $or: [{ command: command }, { aliases: command }],
    deleted: { $ne: true },
  });
}

module.exports = { get };
