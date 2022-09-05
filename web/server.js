const express = require("express");
const Handlebars = require("handlebars");
const expressHandlebars = require("express-handlebars");
const {
  allowInsecurePrototypeAccess,
} = require("@handlebars/allow-prototype-access");
const hbHelpers = require("./helpers/handlebars.js");
const insecureHandlebars = expressHandlebars({
  handlebars: allowInsecurePrototypeAccess(Handlebars),
  defaultLayout: "main",
  extname: ".hbs",
  helpers: hbHelpers,
});
const db = require("./db");
const logger = require("morgan");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const expressSanitizer = require("express-sanitizer");
const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const MongoStore = require("connect-mongo")(session);

// Read local config
let config = require("./config.json");

const app = express(),
  port = process.env.PORT || config.webapp.port || 3000,
  env = process.env.NODE_ENV || config.webapp.env || "development";

// Set app environment
app.set("env", env);

// Set up logging
app.use(logger(config.webapp.logFormat));

// Discourage exploits
app.disable("x-powered-by");

// Make app config available everywhere
app.locals.config = config;

// Use Handlebars for templating
app.engine(".hbs", insecureHandlebars);
app.set("view engine", ".hbs");

// Request parsing + sanitizing
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(expressSanitizer());

const getExpirationDate = (sessionExpirationSeconds) => {
  return new Date(Date.now() + sessionExpirationSeconds * 1000);
};

// Set up sessions if they're configured
if (config.webapp.session && config.webapp.session.secret) {
  let sessionExpirationSeconds = config.webapp.session.ttl || 14 * 24 * 60 * 60; // = 14 days. Default
  app.use(
    session({
      secret: config.webapp.session.secret,
      resave: false,
      saveUninitialized: false,
      store: new MongoStore({
        url: `${config.db.host}/${config.db.db}`,
        ttl: sessionExpirationSeconds,
        stringify: false,
      }),
      cookie: { expires: getExpirationDate(sessionExpirationSeconds) },
    })
  );
}

app.use(passport.initialize());
app.use(passport.session());

// inject logged-in user data to all requests
app.use((req, res, next) => {
  res.locals.user = req.user;
  next();
});

// Refresh userConfig on each request
app.use((req, res, next) => {
  db.get()
    .collection("config")
    .findOne({ default: true }, (err, userConfig) => {
      if (!err) {
        config = Object.assign(config, userConfig);
        res.locals.config = config;
        next();
      } else {
        console.error(`Unable to read config from database: ${err}`);
      }
    });
});

// Routing for static files
app.use(express.static("public"));

// Routing for everything else
app.use(require("./routes"));

// User auth
var Account = require("./models/account");
passport.use(new LocalStrategy(Account.authenticate()));
passport.serializeUser(Account.serializeUser());
passport.deserializeUser(Account.deserializeUser());

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

// Connect to Mongo and start listening on the configured port
if (!config.db || !config.db.host || !config.db.db) {
  console.error(
    "Database has not been properly configured -- check config.json!"
  );
  process.exit(1);
}

db.connect(config.db.host, config.db.db, (err) => {
  if (!err) {
    app.listen(port, () => {
      console.log(`Listening on port ${port}`);
    });
  } else {
    console.error("Unable to connect to database. Check config.json!", err);
    process.exit(1);
  }
});
