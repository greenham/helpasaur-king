const express = require("express");
const router = express.Router();
const Config = require("../../models/config");

// Endpoint: /config

// GET / -> returns all configs
router.get("/", async (req, res) => {
  try {
    const configs = await Config.find();
    res.status(200).json(configs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /:id -> returns config for id
router.get("/:id", async (req, res) => {
  try {
    const result = await Config.findOne({ id: req.params.id });
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
