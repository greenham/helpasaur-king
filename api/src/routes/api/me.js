const express = require("express")
const router = express.Router()
const User = require("../../models/user")

// User Endpoints (/api/me)

// GET /me
router.get("/", async (req, res) => {
  try {
    const user = await User.findById(req.user.sub)
    res.status(200).json(user)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// GET /me/twitch
router.get("/twitch", async (req, res) => {
  try {
    const user = await User.findById(req.user.sub)
    res.status(200).json({ ...user.twitchBotConfig })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

module.exports = router
