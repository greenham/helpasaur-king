const express = require('express'),
  router = express.Router(),
  staticCommands = require('../lib/commands.js'),
  moment = require('moment-timezone'),
  db = require('../db');

router.get('/', (req, res) => {
	res.render('settings/index');
});

router.get(['/commands', '/commands/:category([a-z]+)'], (req, res) => {
	let category = req.params.category || 'all';
	res.render('settings/commands', {commands: staticCommands.getCommandsInCategory(category)});
});

// Manage Command
router.get('/commands/:id([a-f0-9]+)', (req, res) => {
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
				res.render('settings/command', {"command": cmd});
			}
		});
});

// Edit Command
router.patch('/commands', (req, res) => {
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

module.exports = router;