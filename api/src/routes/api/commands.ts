import express, { Request, Response, Router } from "express"
import Command from "../../models/command"
import CommandLog from "../../models/commandLog"
import { requireJwtToken } from "../../lib/utils"
import {
  sendSuccess,
  sendError,
  handleRouteError,
} from "../../lib/responseHelpers"
import guard from "express-jwt-permissions"

const router: Router = express.Router()
const permissionGuard = guard()

// Endpoint: /commands

// ======== PUBLIC ENDPOINTS ========
// GET / -> returns all active commands
router.get("/", async (req: Request, res: Response) => {
  try {
    const commands = await Command.find({ deleted: { $ne: true } })
    sendSuccess(res, commands)
  } catch (err: any) {
    handleRouteError(res, err, "get commands")
  }
})

// GET /:id -> returns command by ID
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const command = await Command.findById(req.params.id)
    sendSuccess(res, command)
  } catch (err: any) {
    handleRouteError(res, err, "get command by ID")
  }
})

// POST /find -> find command by name or alias
router.post("/find", async (req: Request, res: Response) => {
  try {
    const command = await Command.findByNameOrAlias(req.body.command)
    sendSuccess(res, command)
  } catch (err: any) {
    handleRouteError(res, err, "find command")
  }
})

// ======== PROTECTED ENDPOINTS ========
// POST / -> create new command
router.post(
  "/",
  requireJwtToken,
  permissionGuard.check("admin"),
  async (req: Request, res: Response) => {
    try {
      delete req.body._id

      // Check for validation errors before uniqueness check
      if (!req.body.command || !req.body.command.trim()) {
        return sendError(res, "Command name is required", 400)
      }
      if (!req.body.response || !req.body.response.trim()) {
        return sendError(res, "Command response is required", 400)
      }

      // Ensure command name and alias uniqueness
      const isUnique = await Command.isUnique(
        req.body.command,
        req.body.aliases
      )
      if (!isUnique) {
        return sendError(
          res,
          "The command name or one of the aliases provided is already in use!",
          409
        )
      }

      const command = await Command.create(req.body)
      sendSuccess(res, command, "Command created successfully", 201)
    } catch (err: any) {
      // Handle MongoDB validation errors
      if (err.name === "ValidationError") {
        const validationErrors = Object.values(err.errors).map((error: any) => {
          if (error.path === "command") {
            return "Command name is required"
          }
          if (error.path === "response") {
            return "Command response is required"
          }
          return error.message
        })
        return sendError(res, validationErrors.join(", "), 400)
      }
      handleRouteError(res, err, "create command")
    }
  }
)

// PATCH /:id -> update command
router.patch(
  "/:id",
  requireJwtToken,
  permissionGuard.check("admin"),
  async (req: Request, res: Response) => {
    try {
      const command = await Command.findById(req.params.id)
      if (!command) {
        return sendError(res, "Command not found", 404)
      }

      // Check for validation errors before updating
      if (
        req.body.command !== undefined &&
        (!req.body.command || !req.body.command.trim())
      ) {
        return sendError(res, "Command name is required", 400)
      }
      if (
        req.body.response !== undefined &&
        (!req.body.response || !req.body.response.trim())
      ) {
        return sendError(res, "Command response is required", 400)
      }

      for (const key in req.body) {
        ;(command as any)[key] = req.body[key]
      }
      await command.save()

      sendSuccess(res, command, "Command updated successfully")
    } catch (err: any) {
      // Handle MongoDB validation errors
      if (err.name === "ValidationError") {
        const validationErrors = Object.values(err.errors).map((error: any) => {
          if (error.path === "command") {
            return "Command name is required"
          }
          if (error.path === "response") {
            return "Command response is required"
          }
          return error.message
        })
        return sendError(res, validationErrors.join(", "), 400)
      }
      handleRouteError(res, err, "update command")
    }
  }
)

// DELETE /:id -> "delete" command by ID
router.delete(
  "/:id",
  requireJwtToken,
  permissionGuard.check("admin"),
  async (req: Request, res: Response) => {
    try {
      // @TODO: Make this a soft delete?
      const result = await Command.deleteOne({ _id: req.params.id })
      sendSuccess(res, undefined, "Command deleted successfully")
    } catch (err: any) {
      handleRouteError(res, err, "delete command")
    }
  }
)

// services only
router.post(
  "/logs",
  requireJwtToken,
  permissionGuard.check("service"),
  async (req: Request, res: Response) => {
    try {
      const commandLog = await CommandLog.create(req.body)
      sendSuccess(res, undefined, "Command usage logged")
    } catch (err: any) {
      handleRouteError(res, err, "log command usage")
    }
  }
)

export default router
