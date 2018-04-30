const express = require('express'),
  router = express.Router(),
  db = require('../../db.js'),
  util = require('../../lib/util.js');

//@TODO: DRY this out
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
			{"$addFields": {
				"bestGroupsTime": {"$min": "$groupsRaceTimes"},
				"averageGroupsTime": {"$avg": "$groupsRaceTimes"}
			}},
			{"$sort": {"bestGroupsTime": 1, "averageGroupsTime": 1}}
			//{"$sort": {"averageGroupsTime": 1}}
		])
		.toArray((err, people) => {
			if (err) {
				console.error(err);
				res.render('error', {"error": err});
			} else {
				if (req.query.format == 'seedlist') {
					// some dumb shit here to place dropouts at the bottom of the list
					let dropouts = [
						"5add1b4da5542065972435be", // Cransoon
						"5add1b4da554206597243629", // Zatox
						"5add1b4da5542065972435b3" // Benteezy
					];

					const reorder = async () => {
						let newList = [];
						let addAtEnd = [];
						await util.asyncForEach(people, async (person, index) => {
							if (dropouts.includes(person._id.toString())) {
								addAtEnd.push(person);
							} else {
								newList.push(person);
							}
						});

						res.render('people/bracket-seeds', {"people": newList.concat(addAtEnd), "pageHeader": "Bracket Seeds"});
					};

					reorder();
				} else {
					res.render('people/index', {"people": people, "pageHeader": "Brackets Participants"});
				}
			}
		});
});

router.get('/comm', (req, res) => {
	db.get().collection('tourney-events').aggregate([
    {$project: { _id: 0, commentators: 1}},
    {$unwind: "$commentators"},
    {$group: {_id: "$commentators.displayName", sessions: {$sum: 1}}},
    {$sort: { sessions: -1 } }
	])
	.toArray((err, commentators) => {
		res.render('people/commentators', {people: commentators});
	});
});

module.exports = router;