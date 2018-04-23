const express = require('express'),
  router = express.Router(),
  db = require('../db');

router.get('/', (req, res) => {
	db.get().collection("tourney-people").find({}).sort({"displayName": 1}).toArray((err, people) => {
		if (err) {
			console.error(err);
			res.render('error', {"error": err});
		} else {
			res.render('people/index', {"people": people});
		}
	});
});

module.exports = router;