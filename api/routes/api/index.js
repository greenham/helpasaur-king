const express = require("express");
const router = express.Router();

router.use("/commands", require("./commands"));
router.use("/configs", require("./configs"));

module.exports = router;
