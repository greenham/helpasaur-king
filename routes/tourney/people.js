const express = require('express'),
  router = express.Router(),
  db = require('../../db.js');

router.get('/', (req, res) => {
	db.get().collection("tourney-people")
		.aggregate([
			{"$addFields": {"displayNameLower": {"$toLower": "$displayName"}}},
			{"$sort": {"displayNameLower": 1}}
		])
		.toArray((err, people) => {
			if (err) {
				console.error(err);
				res.render('error', {"error": err});
			} else {
				res.render('people/index', {"people": people, "pageHeader": "Tourney Participants"});
			}
		});
});

router.get('/brackets', (req, res) => {
	db.get().collection("tourney-people")
		.aggregate([
			{"$match": {"inBrackets": true}},
			{"$addFields": {"bestGroupsTime": {"$min": "$groupsRaceTimes"}}},
			{"$sort": {"bestGroupsTime": 1}}
		])
		.toArray((err, people) => {
			if (err) {
				console.error(err);
				res.render('error', {"error": err});
			} else {
				if (req.query.format == 'seedlist') {
					res.render('people/bracket-seeds', {"people": people, "pageHeader": "Bracket Seeds"});
				} else {
					res.render('people/index', {"people": people, "pageHeader": "Brackets Participants"});
				}
			}
		});
});

module.exports = router;