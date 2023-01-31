const express = require("express");
const logger = require("morgan");
const bodyParser = require("body-parser");
const expressSanitizer = require("express-sanitizer");
const { create } = require("express-handlebars");
const axios = require("axios");

const { PORT, NODE_ENV, API_URL } = process.env;
const port = PORT || 3000;
const env = NODE_ENV || "development";

// Create the app
const app = express();

// Set app environment
app.set("env", env);

// Set up logging
app.use(logger("tiny"));

// Fetch all configs via API and store in app.locals
axios
  .get(`${API_URL}/configs`)
  .then((result) => {
    let configsMap = new Map();
    result.data.forEach((config) => {
      configsMap.set(config.id, config.config);
    });
    app.locals.configs = configsMap;
    app.locals.botName = configsMap.get("general").botName;
  })
  .catch((err) => {
    console.error(`Error fetching config: ${err.message}`);
    // @TODO: build in retry
  });

// Discourage exploits
app.disable("x-powered-by");

// Use Handlebars for templating
const hbs = create({
  extname: ".hbs",
  helpers: require("./helpers/handlebars"),
});
app.engine(".hbs", hbs.engine);
app.set("view engine", ".hbs");
app.set("views", "./views");

// Request parsing + sanitizing
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(expressSanitizer());

// Routing for static files
app.use(express.static("public"));

// Routing for everything else
app.use(require("./routes"));

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  var err = new Error("Not Found");
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get("env") === "development") {
  app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    // @TODO: Detect if this request was via ajax, in which case, send the result directly, don't render
    res.render("error", {
      message: err.message,
      error: err,
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function (err, req, res, next) {
  res.status(err.status || 500);
  // @TODO: Detect if this request was via ajax, in which case, send the result directly, don't render
  res.render("error", {
    message: err.message,
    error: {},
  });
});

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});

process.on("unhandledRejection", (error) => {
  console.error("Unhandled promise rejection:", error);
});
