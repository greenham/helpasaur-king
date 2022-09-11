const express = require("express");
const router = express.Router();

// Endpoint: /streams

// GET / -> returns all live alttp streams
router.get("/live", async (req, res) => {
  try {
    res.status(200).json([]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
