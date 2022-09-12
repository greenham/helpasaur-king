const express = require("express");
const router = express.Router();

router.use("/commands", require("./commands"));
router.use("/configs", require("./configs"));
router.use("/streams", require("./streams"));
router.use("/twitch", require("./twitch"));

module.exports = router;
