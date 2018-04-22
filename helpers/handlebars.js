const moment = require('moment-timezone'),
  SRTV = require('../lib/srtv.js');

let hbsHelpers = (hbs) => {
	return hbs.create({
		defaultLayout: 'main',
		extname: '.hbs',
		helpers: {
			eq: (v1, v2) => {
        return v1 === v2;
	    },
	    ne: (v1, v2) => {
        return v1 !== v2;
	    },
	    lt: (v1, v2) => {
        return v1 < v2;
	    },
	    gt: (v1, v2) => {
        return v1 > v2;
	    },
	    lte: (v1, v2) => {
        return v1 <= v2;
	    },
	    gte: (v1, v2) => {
        return v1 >= v2;
	    },
	    and: (v1, v2) => {
        return v1 && v2;
	    },
	    or: (v1, v2) => {
        return v1 || v2;
	    },
			"localize": localize,
			"calendarize": calendarize,
			"timeago": timeago,
			"srtvUrl": srtvUrl,
			"decorateRacers": decorateRacers,
			"parseCommentary": parseCommentary,
			"restreamStatus": restreamStatus,
			"racerInfo": racerInfo,
			"hrt": hrt,
			"multipleOf": multipleOf
		}
	});
};

let localize = (time) => {
	return moment(time).tz("America/Los_Angeles").format('LLLL');
};

let calendarize = (time) => {
	return moment(time).tz("America/Los_Angeles").calendar();
};

let timeago = (time) => {
	return `<time class="timeago" datetime="${moment(time).format()}">${moment(time).calendar()}</time>`;
};

let srtvUrl = (guid) => {
	return SRTV.raceUrl(guid);
};

let decorateRacers = (players) => {
	let ret = '<span class="racers">';

	if (players[0] !== null) {
		ret += `<span class="racer">${players[0].displayName}</span> <small>v</small> `;
	}

	if (players[1] !== null) {
		ret += `<span class="racer">${players[1].displayName}</span>`;
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
  let sec_num = parseInt(s, 10);
  let hours   = Math.floor(sec_num / 3600);
  let minutes = Math.floor((sec_num - (hours * 3600)) / 60);
  let seconds = sec_num - (hours * 3600) - (minutes * 60);

  if (hours   < 10) {hours   = "0"+hours;}
  if (minutes < 10) {minutes = "0"+minutes;}
  if (seconds < 10) {seconds = "0"+seconds;}
  return hours+':'+minutes+':'+seconds;
};

let multipleOf = (mult, check, options) => {
	if (check % mult === 0) {
		return options.fn(this);
	} else {
		return options.inverse(this);
	}
};

module.exports = hbsHelpers;