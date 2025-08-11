import express from "express"
const router = express.Router()

router.use("/api", require("./api"))
router.use("/auth", require("./auth"))

export default router