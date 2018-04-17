const request = require('request'),
  fs = require('fs'),
  path = require('path'),
  moment = require('moment-timezone');

const baseUrl = "http://speedgaming.org/api/",
  userAgent = "alttp-bot/1.0";

function upcoming(event, interval, cb)
{
  return new Promise((resolve, reject) => {
    // Get the current time in EDT
    let now = moment().tz("America/New_York");
    let start = now.format();
    let end = now.add(interval).format();
    getEventSchedule(start, end, event)
      .then(result => {
        resolve(result);
      })
      .catch(reject);
  });
}

function getEventSchedule(from, to, event)
{
  let callUrl = baseUrl + "/schedule/";
  return new Promise((resolve, reject) => {
    let req = {
      url: callUrl,
      qs: {"from": from, "to": to, "event": event},
      headers: {'User-Agent': userAgent}
    };

    request(req, function(error, response, body) {
      if (error) {
        reject(new Error(`${response.statusCode} Error Response from SpeedGaming API: ${error}`));
      } else if (response.statusCode == 200) {
        let data = JSON.parse(body);
        if (data.error) {
          reject(data.error);
        }

        if (data) {
          resolve(data);
        } else {
          reject(new Error('Unexpected response/format from SpeedGaming API: ' + data));
        }
      } else if (response.statusCode == 404) {
          resolve([]);
      } else {
        reject(`Unexpected response from SpeedGaming during getEventSchedule: ${JSON.stringify(response)}`);
      }
    });
  });
}

module.exports = {
  upcoming: upcoming
};
