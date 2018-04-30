const request = require('request'),
  fs = require('fs'),
  path = require('path'),
  NodeCache = require('node-cache'),
  util = require('./util.js'),
  baseUrl = "https://beta.api.speedracing.tv",
  webUrl = "https://speedracing.tv",
  srtvCache = new NodeCache();

// Read in bot configuration
let config = require('../config.json');

let apiRequest = request.defaults({
  headers: {"User-Agent": config.userAgent},
  json: true
});

// Log the bot in and get a token if one isn't already cached
function login()
{
  return new Promise((resolve, reject) => {
    if (!config.srtv || !config.srtv.username || !config.srtv.password) {
      reject("SRTV has not been configured properly! Check config.json");
    }

    srtvCache.get('login-token', (err, value) => {
      if (!err) {
        if (value == undefined) {
          // not cached, log in and get a new token
          let req = {
            url: `${baseUrl}/sessions/login`,
            method: "POST",
            body: {
              username: config.srtv.username,
              password: config.srtv.password
            }
          };

          apiRequest(req, function(error, response, body) {
            if (error) {
              reject(error);
            } else if (response.statusCode == 200) {
              srtvCache.set('login-token', body.token, 86400, (err, success) => {
                if (err) console.error(err);
                resolve(body.token);
              });
            } else if (response.statusCode == 403) {
              reject("Bad username or password");
            } else {
              reject(`Unexpected response from SRTV during login: ${JSON.stringify(response)}`);
            }
          });
        } else {
          resolve(value);
        }
      } else {
        reject(err);
      }
    });
  });
}

function getRace(guid)
{
  return new Promise((resolve, reject) => {
    let req = {url: `${baseUrl}/races/${guid}`};

    apiRequest(req, function(error, response, body) {
      if (error) {
        reject(error);
      } else if (response.statusCode == 200) {
        resolve(body);
      } else if (response.statusCode == 404) {
        reject(`No race matching this GUID: ${guid}`);
      } else {
        reject(`Unexpected response from SRTV during getRace: ${JSON.stringify(response)}`);
      }
    });
  });
}

function createRace(race)
{
  return new Promise((resolve, reject) => {
    login()
      .then(token => {
        let req = {
          url: `${baseUrl}/races`,
          method: "POST",
          headers: {"Hydra-User": token},
          body: race
        };

        apiRequest(req, function(error, response, body) {
          if (error) {
            reject(error);
          } else if (response.statusCode == 200) {
            resolve(body.guid);
          } else if (response.statusCode == 400) {
            reject(`400 Error from SRTV: ${response.headers.hydra-error-code}: ${response.headers.hydra-error-text}`);
          } else if (response.statusCode == 403) {
            reject(`403 Error from SRTV: No user provided or user does not have permission to create a race.`);
          } else {
            reject(`Unexpected response from SRTV during createRace: ${JSON.stringify(response)}`);
          }
        });
      })
      .catch(reject);
  });
}

function say(guid, message)
{
  if (Array.isArray(message)) {
    return new Promise((resolve, reject) => {
      const start = async () => {
        await util.asyncForEach(message, async (msg) => {
          await sendChatMessage(guid, msg).catch(err => {reject(err)});
        });
        resolve(true);
      };
      start();
    });
  } else if (typeof message === "string") {
    return sendChatMessage(guid, message);
  } else {
    throw "'message' is not a String or Array!";
  }
}

function sendChatMessage(guid, message)
{
  return new Promise((resolve, reject) => {
    login()
      .then(token => {
        let req = {
          url: `${baseUrl}/chats/${guid}/message`,
          method: "POST",
          headers: {"Hydra-User": token},
          body: {"message": message}
        };

        apiRequest(req, function(error, response, body) {
          if (error) {
            reject(error);
          } else if (response.statusCode == 204) {
            resolve(true);
          } else if (response.statusCode == 400) {
            reject(`400 Error from SRTV: ${response.headers.hydra-error-code}: ${response.headers.hydra-error-text}`);
          } else if (response.statusCode == 403) {
            reject("User does not have permission to post in this chat.");
          } else if (response.statusCode == 404) {
            reject(`No chat matching this GUID: ${guid}`);
          } else {
            reject(`Unexpected response from SRTV during sendChatMessage: ${JSON.stringify(response)}`);
          }
        });
      })
      .catch(console.error);
  });
}

function raceUrl(guid)
{
  return `${webUrl}/races/${guid}`;
}

module.exports = {
  getRace: getRace,
  createRace: createRace,
  say: say,
  raceUrl: raceUrl
};
