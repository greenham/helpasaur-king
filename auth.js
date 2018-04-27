var passport = require('passport'),
  LocalStrategy = require('passport-local').Strategy,
  User = require('./models/user.js'),
  db = require('./db');

passport.use(new LocalStrategy(
  {
    usernameField: 'username',
    passwordField: 'passworddd'
  },
  function(username, password, done) {
    User.authenticate(username, password, function (err, user) {
      if (err) { return done(err); }
      if (!user) {
        return done(null, false, { message: 'Incorrect username or password.' });
      }
      return done(null, user);
    });
  }
));

passport.serializeUser(function(user, done) {
  done(null, user._id);
});

passport.deserializeUser(function(id, done) {
  User.findOne({_id: db.oid(id)})
  .exec(function(err, user) {
    done(err, user);
  });
});

exports.engine = passport;
