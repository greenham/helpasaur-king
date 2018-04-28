const moment = require('moment-timezone'),
  SRTV = require('../lib/srtv.js'),
  util = require('../lib/util.js');

let hbsHelpers = (hbs) => {
	return hbs.create({
		defaultLayout: 'main',
		extname: '.hbs',
		helpers: {
			"eq": (v1, v2) => {
        return v1 === v2;
	    },
	    "ne": (v1, v2) => {
        return v1 !== v2;
	    },
	    "lt": (v1, v2) => {
        return v1 < v2;
	    },
	    "gt": (v1, v2) => {
        return v1 > v2;
	    },
	    "lte": (v1, v2) => {
        return v1 <= v2;
	    },
	    "gte": (v1, v2) => {
        return v1 >= v2;
	    },
	    "and": (v1, v2) => {
        return v1 && v2;
	    },
	    "or": (v1, v2) => {
        return v1 || v2;
	    },
	    "sum": util.sum,
	    "avg": util.average,
			"localize": localize,
			"calendarize": calendarize,
			"timeago": timeago,
			"srtvUrl": srtvUrl,
			"decorateRacers": decorateRacers,
			"parseCommentary": parseCommentary,
			"restreamStatus": restreamStatus,
			"racerInfo": racerInfo,
			"hrt": hrt,
			"multipleOf": multipleOf,
			"math": math,
			"join": join
		}
	});
};

let localize = (time, timezone) => {
	console.log(timezone);
	timezone = timezone || "America/Los_Angeles";
	return moment(time).tz(timezone).format('LLLL');
};

let calendarize = (time, timezone) => {
	timezone = timezone || "America/Los_Angeles";
	return moment(time).tz(timezone).calendar();
};

let timeago = (time) => {
	return `<time class="timeago" datetime="${moment(time).format()}">${moment(time).calendar()}</time>`;
};

let srtvUrl = (guid) => {
	return SRTV.raceUrl(guid);
};

let decorateRacers = (players) => {
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

let parseCommentary = (commentators) => {
	if (commentators === null || commentators.length === 0) {
		return '<span class="text-muted"><em>None</em></span>';
	}

	let ret = '<span class="commentators">';
	ret += commentators.map(e => {
		return '<span' + ((!e.approved) ? 'class="text-warning"':'') + '>' + e.displayName + '</span>';
	}).join(', ');
	ret += '</span>';
	return ret;
};

let restreamStatus = (channel) => {
	if (channel) {
  	if (channel.slug.match(/^speedgaming/)) {
  		return `<a href="https://twitch.tv/${channel.slug}" target="_blank">${channel.name}</a>`;
  	} else {
			return channel.name;
		}
	} else {
		return '<span class="text-muted"><em>Undecided</em></span>';
	}
};

let racerInfo = (racer) => {
	ret = '';
	if (racer.streamingFrom) {
		ret += `<li class="list-group-item"><i class="fab fa-twitch"></i>&nbsp;<a href="https://www.twitch.tv/${racer.streamingFrom}" target="_blank">${racer.streamingFrom}</a></li>`;
	}
	if (racer.discordTag || racer.discordId) {
		ret += `<li class="list-group-item"><i class="fab fa-discord"></i>&nbsp;${racer.discordTag || racer.discordId}</li>`;
	}
	return ret;
};

let hrt = (s) => {
	return s.toString().toHHMMSS();
};

let multipleOf = (mult, check, options) => {
	if (check % mult === 0) {
		return options.fn(this);
	} else {
		return options.inverse(this);
	}
};

let math = function(lvalue, operator, rvalue, options) {
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

let join = function(arr, glue, options) {
	return arr.join(glue);
}

module.exports = hbsHelpers;