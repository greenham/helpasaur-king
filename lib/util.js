async function asyncForEach(array, callback) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array)
  }
}

function range(start,stop) {
  var result=[];
  for (var idx=start.charCodeAt(0),end=stop.charCodeAt(0); idx <=end; ++idx){
    result.push(String.fromCharCode(idx));
  }
  return result;
};

function randElement(arr) {
	return arr[Math.floor(Math.random() * arr.length)];
}

module.exports = {
	asyncForEach: asyncForEach,
	range: range,
	randElement
};