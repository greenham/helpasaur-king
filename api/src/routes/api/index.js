const express = require("express");
const { requireJwtToken } = require("../../lib/utils");
const router = express.Router();

router.use(express.json());

// Public Endpoints
router.use("/commands", require("./commands"));
router.use("/streams", require("./streams"));
router.use("/web", require("./web"));

// Authorized Endpoints
router.use("/me", requireJwtToken, require("./me"));
router.use("/twitch", requireJwtToken, require("./twitch"));
router.use("/streamAlerts", requireJwtToken, require("./stream-alerts"));
router.use("/configs", requireJwtToken, require("./configs"));

module.exports = router;
