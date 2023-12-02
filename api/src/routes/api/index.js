const express = require("express");
const cookieParser = require("cookie-parser");
const { requireAuthKey, requireJwtToken } = require("../../lib/utils");
const router = express.Router();
const User = require("../../models/user");

router.use(express.json());

// Public Endpoints
router.use("/commands", require("./commands"));
router.use("/streams", require("./streams"));
router.use("/web", require("./web"));

// Service Endpoints
router.use("/twitch", requireAuthKey, require("./twitch"));
router.use("/configs", requireAuthKey, require("./configs"));
router.use("/streamAlerts", requireAuthKey, require("./stream-alerts"));

// User Endpoints
router.use(cookieParser());
router.get("/me", requireJwtToken, async (req, res) => {
  try {
    const user = await User.findById(req.auth.sub);
    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
