module.exports = {
  get: isOnCooldown,
  set: placeOnCooldown
};

const memcache = require('memcache'),
  md5 = require('md5'),
  keyPrefix = 'cd';

const cache = new memcache.Client();
cache.on('error', console.error);
cache.connect();

// Given a cooldownTime in seconds and a command, returns false if the command is not on cooldown
// returns the time in seconds until the command will be ready again otherwise
function isOnCooldown(command, cooldownTime, callback)
{
  return new Promise((resolve, reject) => {
    let now = Date.now();
    let onCooldown = false;
    let key = keyPrefix + md5(command);

    cache.get(key, function(err, timeUsed) {
      if (err) reject(err);

      if (timeUsed !== null) {
        // Command was recently used, check timestamp to see if it's on cooldown
        if ((now - timeUsed) <= (cooldownTime*1000)) {
          // Calculate how much longer it's on cooldown
          onCooldown = ((cooldownTime*1000) - (now - timeUsed))/1000;
        }
      }

      resolve(onCooldown);
    });
  });
}

// Places a command on cooldown for cooldownTime (in seconds)
function placeOnCooldown(command, cooldownTime)
{
  let key = keyPrefix + md5(command);
  return cache.set(key, Date.now(), handleCacheSet, cooldownTime);
}

function handleCacheSet(error, result) {}

process.on('exit', (code) => {cache.close()});