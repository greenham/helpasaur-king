var db = require('../db');
var Account = require('../models/account');
var config = require('../config.json');

db.connect(config.db.host, config.db.db, (err) => {
	if (!err) {
		let username = process.argv[2] || null;
		let password = process.argv[3] || null;
		Account.register(
			new Account({
				username: username,
				roles: ["everyone"],
				timezone: "America/Los_Angeles"
			}),
			password,
			function(err, account) {
				db.close();

	      if (err) {
	        return console.error(err);
	      }

	      console.log('New account created!', account);
	    });
	} else {
		console.error('Unable to connect to database. Check config.json!', err);
		process.exit(1);
	}
});