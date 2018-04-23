module.exports = {
  get: get,
  getAll: getAll
};

const db = require('../db.js'),
  config = require('../config.json'),
  collectionName = "bot-commands",
  pollIntervalSeconds = 30;

let state = {
  commands: []
};

db.connect(config.db.host, config.db.db, (err) => {
  if (!err) {
    // Read in basic text commands / definitions
    fetchAll().then(result => {
      state.commands = result;
      // Poll for changes
      setInterval(
        () => {fetchAll().then(result => {state.commands = result}).catch(console.error);},
        pollIntervalSeconds*1000
      );
    })
    .catch(console.error);
  } else {
    console.error('Unable to connect to Mongo.');
    process.exit(1);
  }
});

// Read the initial state from the database
function fetchAll()
{
  return new Promise((resolve, reject) => {
    db.get().collection(collectionName)
      .find({})
      .sort({"command": 1})
      .toArray((err, commands) => {
        if (err) reject(err);
        resolve(commands);
      });
  });
}

function get(command)
{
  return state.commands.find(e => {
    return (e.command == command || e.aliases.includes(command));
  });
}

function getAll()
{
  return state.commands;
}