import { Response } from "express"

/**
 * Standardized API response format for the server
 * Uses the same structure as the client's ApiResponse<T> but with server-side types
 */
interface ServerApiResponse<T = any> {
  result: "success" | "error" | "noop"
  message?: string
  data?: T
}

/**
 * Send a successful API response with optional data
 * @param res - Express response object
 * @param data - Data to include in the response (optional)
 * @param message - Success message (optional)
 * @param statusCode - HTTP status code (default: 200)
 */
export const sendSuccess = <T>(
  res: Response,
  data?: T,
  message?: string,
  statusCode = 200
): void => {
  const response: ServerApiResponse<T> = {
    result: "success",
    ...(message && { message }),
    ...(data !== undefined && { data }),
  }
  res.status(statusCode).json(response)
}

/**
 * Send an error API response
 * @param res - Express response object
 * @param message - Error message
 * @param statusCode - HTTP status code (default: 500)
 */
export const sendError = (
  res: Response,
  message: string,
  statusCode = 500
): void => {
  const response: ServerApiResponse<null> = {
    result: "error",
    message,
  }
  res.status(statusCode).json(response)
}

/**
 * Send a no-operation API response (when request is valid but no action needed)
 * @param res - Express response object
 * @param message - Optional message explaining why no action was taken
 * @param statusCode - HTTP status code (default: 200)
 */
export const sendNoop = (
  res: Response,
  message?: string,
  statusCode = 200
): void => {
  const response: ServerApiResponse<null> = {
    result: "noop",
    ...(message && { message }),
  }
  res.status(statusCode).json(response)
}

/**
 * Helper to handle async route errors consistently
 * @param res - Express response object
 * @param error - The caught error
 * @param operation - Description of the operation that failed (for logging)
 */
export const handleRouteError = (
  res: Response,
  error: any,
  operation: string
): void => {
  console.error(`Error in ${operation}:`, error)
  sendError(res, error.message || `Failed to ${operation}`)
}
