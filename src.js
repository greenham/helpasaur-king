// @todo write to cache instead of file

// Import modules
var request = require('then-request'),
  fs = require('fs'),
  path = require('path');

var categoryNameMap = {
  "Any%": "any",
  "100%": "100",
  "Low%": "low",
  "Master Sword": "ms",
  "Mirror Shield": "mrs",
  "Any% (No EG/DG/WW)": "anyno",
  "Reverse Boss Order": "rbo",
  "Defeat Ganon": "dg",
  "All Dungeons (No EG)": "ad",
  "All Dungeons (Swordless)": "swordless"
};

var srcCategoriesPath = path.join(__dirname, 'etc', 'src_categories');
fs.writeFileSync(srcCategoriesPath, '');

var gameAbbr = 'alttp',
  userAgent = 'alttp-bot/1.0',
  searchDefaults = {
    baseUrl: 'http://www.speedrun.com/api/v1',
    headers: {
      'User-Agent': userAgent,
    }
  };

var compileSrcCategories = function() {
  var srcCategories = [];
  request('GET', searchDefaults.baseUrl + '/games/'+encodeURIComponent(gameAbbr)+'/categories', {headers: searchDefaults.headers}).done(function(res) {
    var categoryData = JSON.parse(res.getBody());
    categoryData.data.forEach(function(category) {
      populateSubCategoryInfo(category, function(newCategory) {
        fs.appendFileSync(srcCategoriesPath, JSON.stringify(newCategory) + '|||||');
      });
    });
  });
};

var populateSubCategoryInfo = function(category, callback)
{
  // Get sub-category info for this category
  request('GET', searchDefaults.baseUrl + '/categories/'+encodeURIComponent(category.id)+'/variables', {headers: searchDefaults.headers}).done(function(res) {
    var subcategories = [];
    var subcatData = JSON.parse(res.getBody());
    subcatData = subcatData.data;
    subcatData.forEach(function(item)
    {
      if (item['is-subcategory'] === true)
      {
        var values = item.values.values;
        for (var subcatId in values)
        {
          if (values.hasOwnProperty(subcatId))
          {
            var subcat = values[subcatId];
            subcategories.push({
              id: subcatId,
              name: subcat.label,
              code: categoryNameMap[subcat.label],
              varId: item.id
              //rules: subcat.rules
            });
          }
        }
      }
    });

    var newCategory = {
        id: category.id,
        name: category.name,
        url: category.weblink,
        //rules: category.rules,
        subcategories: subcategories
    };

    callback(newCategory);
  });
};

compileSrcCategories();