const request = require('request'),
  util = require('util'),
  emitter = require('events').EventEmitter,
  memcache = require('memcache'),
  md5 = require('md5');

const defaultConfig = {
  "clientId": "",
  "gameName": "",
  "statusFilters": "",
  "updateIntervalSeconds": 60,
  "offlineToleranceSeconds": 600
};

function StreamAlerts(channels, config)
{
  let self = this;

  self.channels = channels || [];
  self.config = config || defaultConfig;

  emitter.call(self);

  // Connect to Twitch to pull a list of currently live speedrun streams for configured game/channels
  self.findStreams = function() {
    return new Promise((resolve, reject) => {
      let search = {
        url: 'https://api.twitch.tv/kraken/streams?limit=100&game='+encodeURIComponent(self.config.gameName)+'&channel='+encodeURIComponent(self.channels.join()),
        headers: {'Client-ID': self.config.clientId}
      };

      let tester = new RegExp(self.config.statusFilters, 'i');

      request(search, function (error, response, body) {
        if (!error && response.statusCode == 200) {
          let filteredStreams = [];
          let info = JSON.parse(body);
          if (info._total > 0) {
            // Attempt to automatically filter out streams by title
            filteredStreams = info.streams.filter(function (item) {
              return !(tester.test(item.channel.status));
            });
          }
          resolve(filteredStreams);
        } else {
          reject(error);
        }
      });
    });
  };

  // Handles sending of live / title change alerts
  self._handle = function(streams) {
    if (!streams) return;

    // Connect to cache
    const cache = new memcache.Client();
    cache.on('connect', () => {
      streams.forEach(stream => {
        // Only emit an event if this stream was not already live
        let cacheKey = md5('livestream-' + stream.channel.name);
        cache.get(cacheKey, function(err, currentStream) {
          if (err) {
            console.error(err);
          } else if (currentStream !== null) {
            // cache hit, stream was already online, check for title change
            currentStream = JSON.parse(currentStream);
            if (currentStream.channel.status !== stream.channel.status) {
              self.emit("title", stream);
            }
          } else {
            // stream is newly live
            self.emit("live", stream);
          }

          // add back to cache, update timeout
          cache.set(cacheKey, JSON.stringify(stream), (error, result) => {}, self.config.offlineToleranceSeconds);
        });
      });
    }).on('error', console.error);
    cache.connect();
  };

  // Starts watching for streams, updates every config.updateIntervalSeconds
  self.watch = function() {
    self.findStreams().then(self._handle).catch(console.error);
    setTimeout(self.watch, self.config.updateIntervalSeconds*1000);
  };
}

util.inherits(StreamAlerts, emitter);

module.exports = StreamAlerts;
