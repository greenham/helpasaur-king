const request = require('request'),
  fs = require('fs'),
  path = require('path'),
  md5 = require('md5'),
  memcache = require('memcache');

const userAgent = "alttp-bot/1.0";

// Connect to cache
const cache = new memcache.Client();
cache.on('error', console.error).connect();

// Read in current category info on SRC (run lib/src-categories.js to refresh)
const indexedCategories = readCategories(path.join(__dirname, '..', 'conf', 'src_categories'));

// Read/parse SRC category information
function readCategories(filePath)
{
  let categories = {};
  let srcCategories = fs.readFileSync(filePath, 'utf-8');
  srcCategories = srcCategories.toString().split('|||||');

  // Re-index subcategories by their main category
  srcCategories.forEach(function(category, index) {
    if (category) {
      category = JSON.parse(category);
      if (/no/i.test(category.name)) {
        categories.nmg = category;
      } else {
        categories.mg = category;
      }
    }
  });

  return categories;
}

function findWR(game, majorCat, minorCat)
{
  return new Promise((resolve, reject) => {
    // look up info for this sub-category in local cache
    let categoryInfo = getCategoryInfo(majorCat, minorCat);
    let category = categoryInfo.category;
    let subcategory = categoryInfo.subcategory;

    if (!subcategory) {
      resolve('Not a valid sub-category name! Codes are listed here: https://github.com/greenham/alttp-bot/blob/master/README.md#category-codes');
    }

    let wrSearchReq = {
      url: `http://www.speedrun.com/api/v1/leaderboards/${game}/category/${category.id}?top=1&embed=players&var-${subcategory.varId}=${subcategory.id}`,
      headers: {'User-Agent': userAgent}
    };

    // Check for cache of this request
    let wrCacheKey = md5(JSON.stringify(wrSearchReq));
    cache.get(wrCacheKey, function(err, res) {
      if (err) reject(err);
      if (res !== null) {
        resolve(res);
      } else {
        // Make a new request to SRC for this data
        request(wrSearchReq, function(error, response, body) {
          if (!error && response.statusCode == 200) {
            let data = JSON.parse(body);
            if (data && data.data && data.data.runs) {
              let run = data.data.runs[0].run;
              let runner = data.data.players.data[0].names.international;
              let runtime = run.times.primary_t;
              let wrResponse = `The current world record for *${category.name} | ${subcategory.name}`
                          + `* is held by **${runner}** with a time of ${runtime.toString().toHHMMSS()}.`
                          + ` ${run.weblink}`;

              // cache the response
              cache.set(wrCacheKey, wrResponse, handleCacheSet, 3600);

              resolve(wrResponse);
            } else {
              reject(new Error('Unexpected response/format from SRC: ' + data));
            }
          } else if (response && response.statusCode == 404) {
              resolve(`No record found for *${category.name} | ${subcategory.name}*`);
          } else {
            reject(new Error('Error while calling SRC API: ' + error));
          }
        });
      }
    });
  });
}

function findPB(username, majorCat, minorCat)
{
  return new Promise((resolve, reject) => {
    // look up info for this sub-category in local cache
    let categoryInfo = getCategoryInfo(majorCat, minorCat);
    let category = categoryInfo.category;
    let subcategory = categoryInfo.subcategory;

    if (!subcategory) {
      resolve('Not a valid sub-category name! Codes are listed here: https://github.com/greenham/alttp-bot/blob/master/README.md#category-codes');
    }

    // look up user on SRC, pull in PB's
    let userSearchReq = {
      url: `http://www.speedrun.com/api/v1/users/${encodeURIComponent(username)}/personal-bests?embed=players`,
      headers: {'User-Agent': userAgent}
    };

    // check for cache of this request
    let cacheKey = md5(JSON.stringify(userSearchReq));
    cache.get(cacheKey, function(err, res) {
      if (err) reject(err);
      if (res !== null) {
        response = findRun(JSON.parse(res), category, subcategory);
        if (response) {
          resolve(response);
        } else {
          reject(new Error('Unable to parse response received from SRC'));
        }
      } else {
        request(userSearchReq, function(error, response, body) {
          if (!error && response.statusCode == 200) {
            let data = JSON.parse(body);

            // add data to cache
            cache.set(cacheKey, JSON.stringify(data), handleCacheSet, 3600);

            response = findRun(data, category, subcategory);
            if (response) {
              resolve(response);
            } else {
              reject(new Error('Unable to parse response received from SRC'));
            }
          } else if (response && response.statusCode == 404) {
            resolve(`No user found matching *${username}*.`);
          } else {
            reject(new Error('Error while calling SRC API: ' + error)); // Print the error if one occurred
          }
        });
      }
    });
  });
}

function getCategoryInfo(majorCat, minorCat)
{
  // look up info for this sub-category in local cache
  let category = indexedCategories[majorCat];
  let subcategory = category.subcategories.find(function(s) {
    return s.code === minorCat;
  });

  return {category: category, subcategory: subcategory};
}

// Given a category/subcategory, find the run in the response from SRC
// and format a response
function findRun(data, category, subcategory)
{
  if (data && data.data) {
    // find the run matching this search
    let run = data.data.find(function(r) {
      return ((r.run.category === category.id) && (r.run.values[subcategory.varId] === subcategory.id));
    });


    if (run && run.run) {
      run.category = category;
      run.subcategory = subcategory;
      return run;
    } else {
      // no PB found in this category for this user
      return false;
    }
  } else {
    console.log('Unexpected response received from SRC: ' + data);
  }

  return;
}

function handleCacheSet(error, result) {}

module.exports = {
  findWR: findWR,
  findPB: findPB
};
