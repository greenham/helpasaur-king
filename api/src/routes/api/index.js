const express = require("express");
const { requireAuthKey } = require("../../lib/utils");
const router = express.Router();

router.use(express.json());

// Public Endpoints
router.use("/commands", require("./commands"));
router.use("/streams", require("./streams"));
router.use("/web", require("./web"));

// "Secure" Endpoints
router.use("/twitch", requireAuthKey, require("./twitch"));
router.use("/configs", requireAuthKey, require("./configs"));
router.use("/streamAlerts", requireAuthKey, require("./stream-alerts"));

module.exports = router;
