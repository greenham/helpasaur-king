const express = require("express");
const guard = require("express-jwt-permissions")();
const { requireJwtToken } = require("../../lib/utils");
const router = express.Router();

router.use(express.json());

// Public Endpoints
router.use("/commands", require("./commands"));
router.use("/streams", require("./streams"));
router.use("/web", require("./web"));
router.use("/public", require("./public"));

// Authorized Endpoints
router.use("/me", requireJwtToken, require("./me"));
router.use("/twitch", requireJwtToken, require("./twitch"));
router.use("/discord", require("./discord"));
router.use(
  "/streamAlerts",
  requireJwtToken,
  guard.check([["admin"], ["service"]]),
  require("./stream-alerts")
);
router.use(
  "/configs",
  requireJwtToken,
  guard.check([["admin"], ["service"]]),
  require("./configs")
);
router.use("/prac", require("./prac"));

module.exports = router;
