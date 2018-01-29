const staticCommands = require('./static-commands.js');
let commands = Object.keys(staticCommands.getAll());
let prefix = '!';
let output = '```';

commands.forEach((cmd) => {
	output += `${prefix}${cmd}, `;
});

output += '```';

console.log(output);