/**
 * ALttP SRL IRC Bot
  */

// Settings
var srlGameName = 'The Legend of Zelda: A Link to the Past',
  srlIrcServer = 'irc.speedrunslive.com',
  srlUsername = 'HelpasaurKing';

// Import modules
var request = require('request'),
  irc = require('irc'),
  fs = require('fs'),
  path = require('path'),
  memcache = require('memcache'),
  md5 = require('md5');

// File paths for config/keys
var srlPassword = fs.readFileSync(path.join(__dirname, 'etc', 'srl_irc_password'), 'utf-8').toString().trim().replace(/\n/, '');

// Connect to cache
var cache = new memcache.Client();
cache.on('connect', () => {
  watchForSrlRaces();
}).on('error', function(e) {
  console.log(e);
});
cache.connect();

// Connect via IRC to SRL and watch for races
function watchForSrlRaces()
{
  // Connect to SRL IRC server
  var client = new irc.Client(srlIrcServer, srlUsername, {
    password: srlPassword,
    autoRejoin: true,
    retryCount: 10,
    channels: ['#speedrunslive']
  });

  // Listen for messages from RaceBot in the main channel
  client.addListener('message#speedrunslive', function (from, message) {
    console.log(from + ': ' + message);
    if (from === 'RaceBot') {
      var raceChannel = message.match(/srl\-([a-z0-9]{5})/),
        srlUrl;
      if (raceChannel) {
        srlUrl = 'http://www.speedrunslive.com/race/?id='+raceChannel[1];
      }
      var goal = message.match(/\-\s(.+)\s\|/);

      /*if (message.startsWith('Race initiated for ' + srlGameName + '. Join')) {
        alertsChannel.send('**SRL Race Started** :: *#' + raceChannel[0] + '* :: A race was just started for ' + srlGameName + '! | ' + srlUrl);
      } else if (message.startsWith('Goal Set: ' + srlGameName + ' - ')) {
        alertsChannel.send('**SRL Race Goal Set** :: *#' + raceChannel[0] + '* ::  __' + goal[1] + '__ | ' + srlUrl);
      } else if (message.startsWith('Race finished: ' + srlGameName + ' - ')) {
        alertsChannel.send('**SRL Race Finished** :: *#' + raceChannel[0] + '* :: __' + goal[1] + '__ | ' + srlUrl);
      } else if (message.startsWith('Rematch initiated: ' + srlGameName + ' - ')) {
        alertsChannel.send('**SRL Rematch** :: *#' + raceChannel[0] + '* :: __' + goal[1] + '__ | ' + srlUrl);
      }*/
    }
  });

  client.addListener('error', function(message) {
    console.error('error from SRL IRC Server: ', message);
  });
}

// catch Promise errors
process.on('unhandledRejection', console.error);

function handleCacheSet(error, result) {}