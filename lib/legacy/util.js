// Converts seconds to human-readable time
String.prototype.toHHMMSS = function () {
  let sec_num = parseInt(this, 10); // don't forget the second param
  let hours = Math.floor(sec_num / 3600);
  let minutes = Math.floor((sec_num - hours * 3600) / 60);
  let seconds = sec_num - hours * 3600 - minutes * 60;

  if (hours < 10) {
    hours = "0" + hours;
  }
  if (minutes < 10) {
    minutes = "0" + minutes;
  }
  if (seconds < 10) {
    seconds = "0" + seconds;
  }
  return hours + ":" + minutes + ":" + seconds;
};

var exports = (module.exports = {});

exports.asyncForEach = async function (array, callback) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
};

exports.range = function (start, stop) {
  var result = [];
  for (
    var idx = start.charCodeAt(0), end = stop.charCodeAt(0);
    idx <= end;
    ++idx
  ) {
    result.push(String.fromCharCode(idx));
  }
  return result;
};

exports.randElement = function (arr) {
  return arr[Math.floor(Math.random() * arr.length)];
};

exports.sum = function (e) {
  let sum = 0;
  for (let i = 0; i < e.length; i++) {
    sum += parseInt(e[i], 10);
  }

  return sum;
};

exports.average = function (e) {
  let sum = exports.sum(e);

  let avg = sum / e.length;

  return avg;
};
