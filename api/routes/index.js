const express = require("express");
const router = express.Router();
const { API_KEY } = process.env;

router.use((req, res, next) => {
  if (!req.get("Authorization") || req.get("Authorization") !== API_KEY)
    return res.sendStatus(401);
  next();
});

router.use("/api", require("./api"));

module.exports = router;
