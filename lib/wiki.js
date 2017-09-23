const MediaWiki = require('mediawiki');
const wiki = new MediaWiki.Bot({
	endpoint: "https://alttp-wiki.net/api.php",
	userAgent: "alttpbot/1.0"
});

let search = process.argv[2] || "test";

wiki.get({action: "query", list: "search", srsearch: `"${search}"`, srwhat: "text", srprop: "snippet|titlesnippet|sectiontitle|sectionsnippet", srlimit: "10"})
	.complete(response => {
		if (response.query.searchinfo.totalhits > 0) {
			console.log(JSON.stringify(response.query));
		} else {
			// no results found
		}
	})
	.error(err => {console.error(err)});

// @todo parse this response and convert title into a link