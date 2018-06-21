const moment = require('moment-timezone'),
  SRTV = require('../lib/srtv.js'),
  util = require('../lib/util.js');

let helpers = {};

helpers.localize = (time, timezone) => {
	timezone = timezone || "America/Los_Angeles";
	return moment(time).tz(timezone).format('LLLL');
};
helpers.calendarize = (time, timezone) => {
	timezone = timezone || "America/Los_Angeles";
	return moment(time).tz(timezone).calendar();
};
helpers.timeago = (time) => {
	let now = null;
	// detect unix timestamp and convert appropriately
	if (time.toString().match(/^[\d]+$/)) {
		now = moment(time, 'X');
	} else {
		now = moment(time);
	}
	return `<time class="timeago" datetime="${now.format()}">${now.calendar()}</time>`;
};
helpers.fromnow = (time) => {
	let now = null;
	// detect unix timestamp and convert appropriately
	if (time.toString().match(/^[\d]+$/)) {
		now = moment(time, 'X');
	} else {
		now = moment(time);
	}
	return now.fromNow();
};
helpers.srtvUrl = (guid) => {return SRTV.raceUrl(guid)};
helpers.decorateRacers = (players) => {
	let ret = '<span class="racers">';

	if (players) {
		if (typeof players[0] !== "undefined") {
			ret += `<span class="racer">${players[0].displayName}</span> <small>v</small> `;
		}

		if (typeof players[1] !== "undefined") {
			ret += `<span class="racer">${players[1].displayName}</span>`;
		}
	}

	ret += '</span>';

	return ret;
};
helpers.parseCommentary = (commentators) => {
	if (commentators === null || commentators.length === 0) {
		return '<span class="text-muted"><em>None</em></span>';
	}

	let ret = '<span class="commentators">';
	ret += commentators.map(e => {
		return '<span' + ((!e.approved) ? ' class="text-warning"':'') + '>' + e.displayName + '</span>';
	}).join(', ');
	ret += '</span>';
	return ret;
};
helpers.restreamStatus = (race) => {
	if (race.channels && race.channels.length > 0) {
		race.channel = race.channels[0];
	}

  if (race.channel) {
  	if (race.channel.slug.match(/^speedgaming/)) {
  		return `<a href="https://twitch.tv/${race.channel.slug}" target="_blank">${race.channel.name}</a>`;
  	} else {
			return race.channel.name;
		}
	} else {
		return '<span class="text-muted"><em>Undecided</em></span>';
	}
};
helpers.racerInfo = (racer) => {
	ret = '';
	if (racer.streamingFrom) {
		ret += `<li class="list-group-item"><i class="fab fa-twitch"></i>&nbsp;<a href="https://www.twitch.tv/${racer.streamingFrom}" target="_blank">${racer.streamingFrom}</a></li>`;
	}
	if (racer.discordTag || racer.discordId) {
		ret += `<li class="list-group-item"><i class="fab fa-discord"></i>&nbsp;${racer.discordTag || racer.discordId}</li>`;
	}
	return ret;
};
helpers.hrt = (s) => {return s.toString().toHHMMSS()};
helpers.multipleOf = (mult, check, options) => {
	if (check % mult === 0) {
		return options.fn(this);
	} else {
		return options.inverse(this);
	}
};
helpers.raceStatus = (srtvRace) => {
	let ret = '<span class="badge badge-';

	if (!srtvRace) {
		ret += 'light">Pending';
	} else if (srtvRace.canceled) {
		ret += 'dark">Canceled';
	} else if (!srtvRace.started) {
		ret += 'info">Waiting on Players';
	} else if (!srtvRace.ended) {
		ret += 'primary">In Progress';
	} else if (srtvRace.ended) {
		ret += 'success">Ended';
	} else {
		ret += 'warning">?';
	}

	ret += '</span>'

	return ret;
};
helpers.raceEntryStatus = (raceEntry, raceStarted) => {
	let badgeClass = 'secondary';
	let status = raceEntry.status;
	switch (raceEntry.status) {
		case 'JOINED':
			break;
		case 'READY':
			if (raceStarted) {
				badgeClass = 'primary';
				status = 'RACING';
			} else {
				badgeClass = 'info';
				status = 'READY';
			}
			break;
		case 'DONE':
			badgeClass = 'success';
			break;
		case 'DNF':
			badgeClass = 'warning';
			break;
		case 'DQ':
			badgeClass = 'warning';
			break;
		case 'REMOVED':
		case 'DROPPED':
			badgeClass = 'danger';
			break;
	}

	return raceEntry.player.name
	+ ((raceStarted && raceEntry.status == 'DONE') ? `<br><code>${helpers.hrt(raceEntry.stamp-raceStarted)}</code>`:'')
	+ `<span class="badge badge-${badgeClass} float-right">${status}</span>`;
};
helpers.raceEntryTime = (raceEntry, raceStarted) => {
	return helpers.hrt(raceEntry.stamp-raceStarted);
};

helpers.math = (lvalue, operator, rvalue, options) => {
  lvalue = parseFloat(lvalue);
  rvalue = parseFloat(rvalue);
      
  return {
      "+": lvalue + rvalue,
      "-": lvalue - rvalue,
      "*": lvalue * rvalue,
      "/": lvalue / rvalue,
      "%": lvalue % rvalue
  }[operator];
};
helpers.join =(arr, glue, options) => {return arr.join(glue)};

// comparisons/logic
helpers.eq = (v1, v2) => {return v1 === v2};
helpers.ne = (v1, v2) => {return v1 !== v2};
helpers.lt = (v1, v2) => {return v1 < v2};
helpers.gt = (v1, v2) => {return v1 > v2};
helpers.lte = (v1, v2) => {return v1 <= v2};
helpers.gte = (v1, v2) => {return v1 >= v2};
helpers.and = (v1, v2) => {return v1 && v2};
helpers.or = (v1, v2) => {return v1 || v2};

helpers.sum = util.sum;
helpers.avg = util.average;

helpers.jsonString = (s) => {return JSON.stringify(s)};

let hbsHelpers = (hbs) => {
	return hbs.create({
		defaultLayout: 'main',
		extname: '.hbs',
		helpers: helpers
	});
};

module.exports = hbsHelpers;