const request = require("request"),
  util = require("util"),
  emitter = require("events").EventEmitter,
  memcache = require("memcache"),
  md5 = require("md5"),
  async = require("async"),
  TwitchApi = require("./twitch-api");

const twitchApiBaseUrl = "https://api.twitch.tv/helix";

const cache = new memcache.Client();
cache.on("error", console.error).connect();

function StreamAlerts(config) {
  let self = this;

  self.config = config;

  emitter.call(self);

  const twitchApi = new TwitchApi(
    self.config.clientId,
    self.config.clientSecret
  );

  self.findStreams = async function () {
    return new Promise(async (resolve, reject) => {
      let headers = await twitchApi.getApiHeaders();
      if (headers === false) {
        reject("Unable to retrieve Twitch access token for API headers");
      }

      let searchUrl = `${twitchApiBaseUrl}/streams?first=100&game_id=${self.config.gameId}`;
      if (self.config.channels.length > 0) {
        self.config.channels.forEach((channel) => {
          searchUrl += `&user_login=${encodeURIComponent(channel)}`;
        });
      }
      let search = { url: searchUrl, headers };

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
                    try {
                      filteredStreams[key].user = JSON.parse(userData);
                    } catch (e) {
                      console.error("Error parsing JSON from cached user data");
                      console.error(e);
                    }
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
                  search.url = `${twitchApiBaseUrl}/users?`;
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
    self.findStreams().then(self._handle).catch(console.error);
    setTimeout(self.watch, self.config.updateIntervalSeconds * 1000);
  };
}

process.on("exit", (code) => {
  cache.close();
});

util.inherits(StreamAlerts, emitter);

module.exports = StreamAlerts;
