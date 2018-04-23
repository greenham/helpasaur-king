const fs = require('fs'),
  path = require('path')
  db = require('../db.js'),
  config = require('../config.json'),
  util = require('../lib/util.js');

db.connect(config.db.host, config.db.db, (err) => {
	if (!err) {
		convertCommands().then(processedCount => {
			console.log(`Processed ${processedCount}`);
		}).catch(console.error);
	} else {
		console.error('Unable to connect to Mongo.');
		process.exit(1);
	}
});

let convertCommands = () => {
	return new Promise((resolve, reject) => {
		const commandsFilePath = path.join(__dirname, '..', 'conf', 'text_commands');
		let commands = {};
		let data = fs.readFileSync(commandsFilePath, 'utf-8');
		let commandLines = data.toString().split('\n');
		let commandParts, aliases;
		let processedCount = 0;

		const start = async () => {
			await util.asyncForEach(commandLines, async (line) => {
			  if (line.length > 0 && line.indexOf('|') !== -1) {
			    commandParts = line.split('|');
			    aliases = commandParts[0].split(',');

			    let newCommand = {
			    	"command": aliases[0],
			    	"aliases": aliases.slice(1),
			    	"response": commandParts[1]
			    };

			    db.get().collection("bot-commands").insert(newCommand, (err, res) => {
			    	if (!err) {
			    		console.log(`Inserted new command ${newCommand.command}`);
			    	} else {
			    		console.error(err);
			    	}
			    });
			  }
				processedCount++;
			});

			resolve(processedCount);
		};

		start();
	});
}
