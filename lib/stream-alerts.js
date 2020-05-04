const request = require("request"),
  util = require("util"),
  emitter = require("events").EventEmitter,
  memcache = require("memcache"),
  md5 = require("md5"),
  async = require("async");

const twitchApiBaseUrl = "https://api.twitch.tv/kraken";
const twitchAuthBaseUrl = "https://id.twitch.tv/oauth2/token";
const twitchNewApiBaseUrl = "https://api.twitch.tv/helix";

const cache = new memcache.Client();
cache.on("error", console.error).connect();

function StreamAlerts(config) {
  let self = this;

  self.config = config;

  emitter.call(self);

  self.getTwitchAccessToken = () => {
    if (self.accessToken) {
      // if the token has not yet expired, just return the existing token
      if (Date.now() < self.accessToken.expiresAt) {
        return self.accessToken.access_token;
      }
    }

    const params = {
      client_id: self.config.clientId,
      client_secret: self.config.clientSecret,
      grant_type: "client_credentials"
    };

    let queryString = Object.keys(params)
      .map((key) => key + "=" + params[key])
      .join("&");

    let requestUrl = twitchAuthBaseUrl + "?" + queryString;

    return new Promise((resolve, reject) => {
      request({ url: requestUrl, method: "POST" }, (err, res, body) => {
        if (err) {
          reject(`Error fetching access token from Twitch: ${err}`);
        }

        if (res.statusCode == 200) {
          self.accessToken = JSON.parse(body);
          self.accessToken.expiresAt =
            Date.now() + self.accessToken.expires_in * 1000;

          // console.log(`Received access token from Twitch:`, self.accessToken);
          // console.log(`Expires at ${self.accessToken.expiresAt}`);

          resolve(self.accessToken.access_token);
        } else {
          reject(
            `Unexpected status code received when fetching access token from Twitch: ${res.statusCode}`
          );
        }
      });
    });
  };

  // Connect to Twitch to pull a list of currently live speedrun streams for configured game/channels
  self.findStreams = function () {
    return new Promise((resolve, reject) => {
      let game = encodeURIComponent(self.config.gameName);
      let channelList = encodeURIComponent(self.config.channels.join());
      let searchUrl = `${twitchApiBaseUrl}/streams?limit=100&stream_type=live&game=${game}`;
      if (channelList.length > 0) {
        searchUrl += `&channel=${channelList}`;
      }
      let search = {
        url: searchUrl,
        headers: {
          "Client-ID": self.config.clientId,
          Accept: "application/vnd.twitchtv.v5+json"
        }
      };

      let tester = new RegExp(self.config.statusFilters, "i");

      request(search, function (error, response, body) {
        if (!error && response.statusCode == 200) {
          let filteredStreams = [];
          let info = JSON.parse(body);
          if (info._total > 0) {
            // Attempt to automatically filter out streams by title
            filteredStreams = info.streams.filter(function (item) {
              return !tester.test(item.title);
            });
          }
          resolve(filteredStreams);
        } else {
          reject(error);
        }
      });
    });
  };

  self.newFindStreams = function () {
    return new Promise((resolve, reject) => {
      let searchUrl = `${twitchNewApiBaseUrl}/streams?first=100&game_id=${self.config.gameId}`;
      if (self.config.channels.length > 0) {
        self.config.channels.forEach((channel) => {
          searchUrl += `&user_login=${encodeURIComponent(channel)}`;
        });
      }
      let search = {
        url: searchUrl,
        headers: {
          "Client-ID": self.config.clientId,
          Authorization: `Bearer ${self.config.clientSecret}`
        }
      };

      let tester = new RegExp(self.config.statusFilters, "i");

      request(search, function (error, response, body) {
        if (error) {
          return reject(error);
        }

        if (response.statusCode == 200) {
          let filteredStreams = [];
          let payload = JSON.parse(body);
          if (payload.data && payload.data.length > 0) {
            // Attempt to automatically filter out streams by type and title
            filteredStreams = payload.data.filter(function (stream) {
              return stream.type === "live" && !tester.test(stream.title);
            });
          }

          // get user data for streams
          if (filteredStreams.length > 0) {
            let missingUserData = [];
            async.eachOf(
              filteredStreams,
              (stream, key, cb) => {
                // find user info in the cache
                // if it's not cached, add it to a list to be cached later
                let cacheKey = md5("twitch-user-data-" + stream.user_id);
                cache.get(cacheKey, function (err, userData) {
                  if (err) {
                    console.error(
                      `Error fetching twitch user data from cache: ${err}`
                    );
                  } else if (userData !== null) {
                    // cache hit, append to stream data
                    filteredStreams[key].user = JSON.parse(userData);
                  } else {
                    // user info is not cached, add it to the list
                    missingUserData.push(stream.user_id);
                  }
                  cb();
                });
              },
              (err) => {
                if (err) {
                  return console.error(
                    `failed checking cache for user data: ${err}`
                  );
                }

                // fetch data for users in uncached list and cache them
                if (missingUserData.length > 0) {
                  search.url = `${twitchNewApiBaseUrl}/users?`;
                  search.url += missingUserData.map((x) => `id=${x}`).join("&");

                  request(search, function (error, response, body) {
                    if (error) {
                      return console.error(
                        `Unable to fetch user data from Twitch for ${missingUserData.length} missing users!`
                      );
                    }

                    if (response.statusCode == 200) {
                      payload = JSON.parse(body);
                      if (payload && payload.data) {
                        async.each(
                          payload.data,
                          (userData, cb) => {
                            // append to stream data
                            streamIndex = filteredStreams.findIndex(
                              (stream) => {
                                return stream.user_id == userData.id;
                              }
                            );

                            if (streamIndex > -1) {
                              filteredStreams[streamIndex].user = userData;
                            }

                            // cache the user data for a day
                            cache.set(
                              md5("twitch-user-data-" + userData.id),
                              JSON.stringify(userData),
                              (error, result) => {},
                              86400
                            );

                            cb();
                          },
                          (err) => {
                            if (err) {
                              console.error(
                                `Error processing missing user data: ${err}`
                              );
                            }

                            resolve(filteredStreams);
                          }
                        );
                      }
                    } else {
                      resolve(filteredStreams);
                    }
                  });
                } else {
                  resolve(filteredStreams);
                }
              }
            );
          } else {
            resolve(filteredStreams);
          }
        } else {
          reject(
            `Unexpected response from Twitch API when fetching streams! Status: ${response.statusCode} | Body: ${body}`
          );
        }
      });
    });
  };

  // Handles sending of live / title change alerts
  self._handle = function (streams) {
    if (!streams || streams.length <= 0) return;

    streams.forEach((stream) => {
      // Only emit an event if this stream was not already live
      let cacheKey = md5("livestream-" + stream.user_name);
      cache.get(cacheKey, function (err, currentStream) {
        if (err) {
          console.error(err);
        } else if (currentStream !== null) {
          // cache hit, stream was already online, check for title change
          currentStream = JSON.parse(currentStream);
          if (currentStream.title !== md5(stream.title)) {
            self.emit("title", stream);
          }
        } else {
          // stream is newly live
          self.emit("live", stream);
        }

        // clean title for memcache and easy comparison
        stream.title = md5(stream.title);

        // add back to cache, update timeout
        cache.set(
          cacheKey,
          JSON.stringify(stream),
          (error, result) => {},
          self.config.offlineToleranceSeconds
        );
      });
    });
  };

  // Starts watching for streams, updates every config.updateIntervalSeconds
  self.watch = function () {
    self.newFindStreams().then(self._handle).catch(console.error);
    setTimeout(self.watch, self.config.updateIntervalSeconds * 1000);
  };
}

process.on("exit", (code) => {
  cache.close();
});

util.inherits(StreamAlerts, emitter);

module.exports = StreamAlerts;
