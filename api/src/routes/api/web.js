const express = require("express");
const router = express.Router();
const Config = require("../../models/config");
const getStreamAlertsConfig = async () => {
  return await Config.findOne({ id: "streamAlerts" });
};

// Endpoint: /web

// GET /config -> returns frontend configuration for web
router.get("/config", async (req, res) => {
  const { config: streamAlertsConfig } = await getStreamAlertsConfig();
  const { channels, statusFilters, blacklistedUsers } = streamAlertsConfig;

  try {
    res.status(200).json({ channels, statusFilters, blacklistedUsers });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
