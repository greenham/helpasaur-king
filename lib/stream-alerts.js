const util = require("util"),
  emitter = require("events").EventEmitter,
  memcache = require("memcache"),
  md5 = require("md5"),
  TwitchApi = require("./twitch-api"),
  axios = require("axios");

const twitchApiBaseUrl = "https://api.twitch.tv/helix/";

const cache = new memcache.Client();
cache.on("error", console.error).connect();

function getCachedUserData(userId) {
  return new Promise((resolve, reject) => {
    let cacheKey = md5("twitch-user-data-" + userId);
    cache.get(cacheKey, function (err, userData) {
      if (err) {
        return reject(`Error retrieving ${cacheKey} from cache: ${err}`);
      }

      if (userData !== null) {
        // cache hit
        try {
          return resolve(JSON.parse(userData));
        } catch (err) {
          return reject(`Error parsing JSON from cached user data: ${e}`);
        }
      } else {
        // cache miss
        resolve(false);
      }
    });
  });
}

function setCachedUserData(userData) {
  return new Promise((resolve, reject) => {
    // cache the user data for a day
    cache.set(
      md5("twitch-user-data-" + userData.id),
      JSON.stringify(userData),
      (error, result) => {
        if (error) return reject(error);
        return resolve(result);
      },
      86400
    );
  });
}

function StreamAlerts(config) {
  let self = this;

  self.config = config;

  emitter.call(self);

  const twitchApi = new TwitchApi(
    self.config.clientId,
    self.config.clientSecret
  );
  const tester = new RegExp(self.config.statusFilters, "i");
  const streamSearchLimit = 100;
  const streamSearchBaseUrl = `/streams?first=100&game_id=${self.config.gameId}`;

  // Connect to Twitch to pull a list of currently live speedrun streams for configured game/channels
  self.findStreams = function () {
    return new Promise(async (resolve, reject) => {
      const headers = await twitchApi.getApiHeaders();
      if (headers === false) {
        return reject("Unable to retrieve Twitch access token for API headers");
      }
      const axiosInstance = axios.create({
        baseURL: twitchApiBaseUrl,
        headers,
      });

      // Break up Twitch API requests into chunks of 100 to get around limits
      let chunks = [];
      for (let i = 0; i < self.config.channels.length; i += streamSearchLimit) {
        chunks.push(self.config.channels.slice(i, i + streamSearchLimit));
      }

      if (chunks.length === 0) {
        chunks = [[]];
      }

      // Process each chunk into a Promise which will resolve with an array of filtered streams populated with user data
      let chunkResults = chunks.map((chunk, index) => {
        return new Promise(async (resolve, reject) => {
          let currentChunkParams = chunk
            .map((c) => `user_login=${encodeURIComponent(c)}`)
            .join("&");

          console.log(`Searching chunk ${index} of size ${chunk.length}`);
          let streamSearchResults;
          try {
            streamSearchResults = await axiosInstance.get(
              `${streamSearchBaseUrl}&${currentChunkParams}`
            );
          } catch (err) {
            console.error(
              `Error making request to ${streamSearchBaseUrl}: ${err}`
            );
            resolve([]);
          }

          if (streamSearchResults.status !== 200) {
            console.error(
              `Unexpected ${streamSearchResults.status} response from Twitch API when performing stream search: ${streamSearchResults.data}`
            );
            resolve([]);
          }

          let filteredStreams = [];
          let streamSearchData = streamSearchResults.data.data;
          if (streamSearchData && streamSearchData.length > 0) {
            console.log(
              `Received ${streamSearchData.length} live results from chunk ${index}, filtering...`
            );
            // Attempt to automatically filter out streams by type and title
            filteredStreams = streamSearchData.filter(function (stream) {
              return stream.type === "live" && !tester.test(stream.title);
            });
            console.log(
              `Found ${filteredStreams.length} streams that pass filter from chunk ${index}`
            );
          } else {
            console.log(`No live results in chunk ${index}`);
          }

          // get user data for streams (either from cache or fresh query)
          if (filteredStreams.length > 0) {
            console.log(
              `Getting user data for ${filteredStreams.length} streams from chunk ${index}...`
            );
            let userIdsMissingData = [];
            for (const [index, stream] of filteredStreams.entries()) {
              try {
                let userData = await getCachedUserData(stream.user_id);
                if (userData) {
                  console.log(
                    `Found user data for ${stream.user_name} in cache!`
                  );
                  filteredStreams[index].user = userData;
                } else {
                  userIdsMissingData.push(stream.user_id);
                  console.log(
                    `User data for ${stream.user_name} is NOT cached, added to list to update.`
                  );
                }
              } catch (err) {
                console.error(err);
                return;
              }
            }

            // fetch data for users in uncached list and cache them
            if (userIdsMissingData.length > 0) {
              console.log(
                `Fetching missing data for ${userIdsMissingData.length} users...`
              );
              let usersSearchParams = `/users?${userIdsMissingData
                .map((x) => `id=${x}`)
                .join("&")}`;

              try {
                let usersSearchResponse = await axiosInstance.get(
                  usersSearchParams
                );
                if (usersSearchResponse.status !== 200) {
                  console.error(
                    `Unexpected ${usersSearchResults.status} response from Twitch API when performing users search: ${usersSearchResults.data}`
                  );
                }

                let usersSearchData = usersSearchResponse.data.data;
                for (const userData of usersSearchData) {
                  // append to stream data
                  streamIndex = filteredStreams.findIndex((stream) => {
                    return stream.user_id == userData.id;
                  });

                  if (streamIndex > -1) {
                    filteredStreams[streamIndex].user = userData;
                  }

                  await setCachedUserData(userData);

                  console.log(
                    `Found and cached user data for ${userData.display_name}, updated stream data`
                  );
                }
              } catch (error) {
                console.error(
                  `Error during users search request ${usersSearchParams}: ${error}`
                );
              }
            }
          }

          resolve(filteredStreams);
        });
      });

      Promise.all(chunkResults)
        .then((results) => {
          let finalStreamList = [].concat.apply([], results);
          console.log(`Resolving with ${finalStreamList.length} streams`);
          resolve(finalStreamList);
        })
        .catch((err) => {
          console.error(`Error resolving chunks: ${err}`);
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
