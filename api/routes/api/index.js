const express = require("express");
const router = express.Router();

router.use("/commands", require("./commands"));

module.exports = router;
