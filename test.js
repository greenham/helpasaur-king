/*let test = null;

if (test) {
	console.log('good');
} else {
	console.log('bad');
}*/


if (test = changeResult()) {
	console.log('good', test);
} else {
	console.log('bad', test);
}

function changeResult()
{
	return undefined;
}