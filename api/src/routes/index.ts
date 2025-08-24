import express, { Router } from "express"
import apiRoutes from "./api"
import authRoutes from "./auth"

const router: Router = express.Router()

router.use("/api", apiRoutes)
router.use("/auth", authRoutes)

export default router
