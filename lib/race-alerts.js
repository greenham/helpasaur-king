const util = require('util'),
  emitter = require('events').EventEmitter,
  irc = require('irc');

const defaultConfig = {
  "username": "",
  "password": "",
  "gameName": "The Legend of Zelda: A Link to the Past",
  "ircServer": "irc.speedrunslive.com"
};

function RaceAlerts(config)
{
  let self = this;

  self.config = config || defaultConfig;

  emitter.call(self);

  self.watch = () => {
    // Connect to SRL IRC server and join the main channel
    let client = new irc.Client(self.config.ircServer, self.config.username, {
      password: self.config.password,
      channels: ['#speedrunslive']
    });

    // Listen for messages from RaceBot in the main channel
    client.addListener('message#speedrunslive', (from, message) => {
      if (from === 'RaceBot') {
        let raceChannel = message.match(/srl\-([a-z0-9]{5})/);
        let srlUrl = (raceChannel) ? 'http://www.speedrunslive.com/race/?id='+raceChannel[1] : null;
        let goal = message.match(/\-\s(.+)\s\|/);

        if (message.startsWith('Race initiated for ' + config.gameName + '. Join')) {
          self.emit("init", raceChannel[0], srlUrl);
        } else if (message.startsWith('Goal Set: ' + config.gameName + ' - ')) {
          self.emit("goal", raceChannel[0], goal[1], srlUrl);
        } else if (message.startsWith('Race finished: ' + config.gameName + ' - ')) {
          self.emit("done", raceChannel[0], goal[1], srlUrl);
        } else if (message.startsWith('Rematch initiated: ' + config.gameName + ' - ')) {
          self.emit("rematch", raceChannel[0], goal[1], srlUrl);
        }
      }
    });

    client.addListener('error', e => {
      self.emit("error", e);
    });
  };
}

util.inherits(RaceAlerts, emitter);

module.exports = RaceAlerts;
