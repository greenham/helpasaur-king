const moment = require('moment-timezone'),
  SRTV = require('../lib/srtv.js');

let hbsHelpers = (hbs) => {
	return hbs.create({
		defaultLayout: 'main',
		extname: '.hbs',
		helpers: {
			"localize": localize,
			"calendarize": calendarize,
			"timeago": timeago,
			"srtvUrl": srtvUrl,
			"decorateRacers": decorateRacers,
			"parseCommentary": parseCommentary,
			"restreamStatus": restreamStatus,
			"racerInfo": racerInfo
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

module.exports = hbsHelpers;