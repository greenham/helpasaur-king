module.exports = {};

const fs = require('fs'),
  path = require('path'),
  cooldowns = require('./cooldowns.js');

const textCommandsFilePath = path.join(__dirname, 'conf', 'text_commands');

// Read in basic text commands / definitions and watch for changes
let textCommands = readTextCommands(textCommandsFilePath);
fs.watchFile(textCommandsFilePath, (curr, prev) => {
  if (curr.mtime !== prev.mtime) {
    textCommands = readTextCommands(textCommandsFilePath);
  }
});

function commandExists(command)
{
  return textCommands.hasOwnProperty(command):
}

// Read/parse text commands from the "database"
function readTextCommands(filePath)
{
  let commands = {};
  let data = fs.readFileSync(filePath, 'utf-8');
  let commandLines = data.toString().split('\n');
  let commandParts;
  commandLines.forEach(function(line) {
    commandParts = line.split('|');
    commands[commandParts[0]] = commandParts[1];
  });
  return commands;
}