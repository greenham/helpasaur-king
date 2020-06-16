const mongoose = require("mongoose");
const ObjectId = require("mongodb").ObjectId;

var state = {
  db: null
};

exports.connect = function (url, dbName, done) {
  if (state.db) return done();

  mongoose
    .connect(`${url}/${dbName}`, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    })
    .then(() => {
      state.db = mongoose.connection.db;
      return done();
    })
    .catch(done);
};

exports.get = function () {
  return state.db;
};

exports.close = function (done) {
  if (state.db) {
    mongoose
      .disconnect()
      .then(() => {
        state.db = null;
        if (done) return done();
      })
      .catch((err) => {
        if (done) return done(err);
        console.error(err);
      });
  }
};

exports.oid = function (id) {
  return ObjectId(id);
};
