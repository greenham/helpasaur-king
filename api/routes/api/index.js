const express = require("express");
const router = express.Router();
const { API_KEY } = process.env;

router.use(express.json());

router.use((req, res, next) => {
  if (!req.get("Authorization") || req.get("Authorization") !== API_KEY)
    return res.sendStatus(401);
  next();
});

router.use("/commands", require("./commands"));
router.use("/configs", require("./configs"));
router.use("/streams", require("./streams"));
router.use("/streamAlerts", require("./stream-alerts"));
router.use("/twitch", require("./twitch"));

module.exports = router;
