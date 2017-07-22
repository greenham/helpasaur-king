module.exports = {
  is: isOnCooldown,
  set: placeOnCooldown
};

const memcache = require('memcache'),
  md5 = require('md5');

let cache = new memcache.Client();
cache.on('connect', () => {
});

// Given a cooldownTime in seconds and a command, returns false if the command is not on cooldown
// returns the time in seconds until the command will be ready again otherwise
// @todo convert from callback to promise
function isOnCooldown(command, cooldownTime, callback)
{
  return new Promise((resolve, reject) => {
    let now = Date.now();
    let onCooldown = false;

    cache.get(md5(command), function(err, timeUsed) {
      if (err) console.log(err);

      if (!err && timeUsed !== null) {
        // Command was recently used, check timestamp to see if it's on cooldown
        if ((now - timeUsed) <= (cooldownTime*1000)) {
          // Calculate how much longer it's on cooldown
          onCooldown = ((cooldownTime*1000) - (now - timeUsed))/1000;
        }
      }

      if (callback !== undefined) callback(onCooldown);
      return onCooldown;
    });
  });
}

// Places a command on cooldown for cooldownTime (in seconds)
function placeOnCooldown(command, cooldownTime)
{
  cache.set(md5(command), Date.now(), handleCacheSet, cooldownTime);
}