const express = require('express'),
  router = express.Router(),
  staticCommands = require('../../lib/commands.js'),
  moment = require('moment-timezone'),
  db = require('../../db.js');

  router.get('/create', (req, res) => {
  	res.render('settings/commands/create');
  });

// Command List (All or by Category)
router.get(['/', '/:category([a-z]+)'], (req, res) => {
	let category = req.params.category || 'all';
	res.render('settings/commands/list', {commands: staticCommands.getCommandsInCategory(category)});
});

// Create Command
router.post('/', (req, res) => {
	if (!req.body) {
		return res.status(400).send("No data received");
	}

	// @TODO: Check if the command exists already (or any aliases)

	let newCommand = {
		command: req.sanitize(req.body.command),
		response: req.sanitize(req.body.response),
		aliases: (req.body.aliases) ? req.sanitize(req.body.aliases).replace(/\s/g, "").split(',') : [],
		enabled: true,
		deleted: false
	};

	console.log(newCommand);

	if (!newCommand.command) {
		return res.status(400).send("Command is required!");
	}
	if (!newCommand.response) {
		return res.status(400).send("Response is required!");
	}

	db.get().collection("bot-commands")
		.insert(newCommand, (err, result) => {
			if (err) {
				console.error(err);
				res.status(500).send(err);
			} else if (!newCommand._id) {
				res.status(500).send("Command was not created properly!");
			} else {
				res.send({id: newCommand._id});
				staticCommands.refresh();
			}
		});	
});

// Read Command
router.get('/:id([a-f0-9]+)', (req, res) => {
	let id = req.params.id || false;
	if (!id) res.redirect('/commands');

	db.get().collection("bot-commands")
		.findOne({"_id": db.oid(id)}, (err, cmd) => {
			if (err) {
				console.error(err);
				res.render("error", {"error": err});
			} else if (!res) {
				res.render("error", {"error": "No match found"});
			} else {
				res.render('settings/commands/edit', {"command": cmd});
			}
		});
});

// Update Command
router.patch('/', (req, res) => {
	let id = req.body.id || false;
	if (!id) return res.status(400).send("Invalid ID provided");

	if (req.body) {
		let update = {};
		if (!req.body.command) {
			return res.status(400).send("Command is required!");
		} else {
			update.command = req.body.command;
		}

		if (!req.body.response) {
			return res.status(400).send("Response is required!");
		} else {
			update.response = req.body.response;
		}

		if (req.body.aliases) {
			req.body.aliases = req.body.aliases.replace(/\s/g, "").split(',');
		}

		update.aliases = req.body.aliases;

		db.get().collection("bot-commands")
			.findOne({"_id": db.oid(id)}, (err, cmd) => {
				if (err) {
					console.error(err);
					res.status(500).send(err);
				} else if (!res) {
					res.status(404).send("No command matching this ID found");
				} else {
					db.get().collection("bot-commands")
						.update({"_id": db.oid(id)}, {$set: update}, (err, result) => {
							if (err) {
								res.status(500).send(err);
							} else {
								res.send({"result": result});
								staticCommands.refresh();
							}
						});
				}
			});	
	}	
});

// Delete Command
router.delete('/', (req, res) => {
	let id = req.body.id || false;
	if (!id) return res.status(400).send("Invalid ID provided");

	db.get().collection("bot-commands")
		.findOne({"_id": db.oid(id)}, (err, cmd) => {
			if (err) {
				console.error(err);
				res.status(500).send(err);
			} else if (!res) {
				res.status(404).send("No command matching this ID found");
			} else {
				db.get().collection("bot-commands")
					.update({"_id": db.oid(id)}, {$set: {"deleted": true}}, (err, result) => {
						if (err) {
							res.status(500).send(err);
						} else {
							res.send({"result": result});
							staticCommands.refresh();
						}
					});
			}
		});	
});

module.exports = router;