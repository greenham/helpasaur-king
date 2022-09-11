const express = require("express");
const logger = require("morgan");
const bodyParser = require("body-parser");
const expressSanitizer = require("express-sanitizer");
const { create } = require("express-handlebars");

const app = express();
const port = process.env.PORT || 3000;
const env = process.env.NODE_ENV || "development";

// Set app environment
app.set("env", env);

// Set up logging
app.use(logger("tiny"));

// Discourage exploits
app.disable("x-powered-by");

// Make app config available everywhere
// app.locals.config = config;

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
