const express = require("express");
const router = express.Router();

router.use("/twitch", require("./twitch"));
router.use("/api", require("./api"));

module.exports = router;
