import { Response } from "express"
import { ApiResult, ApiResponse } from "@helpasaur/types"

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
  const response: ApiResponse<T> = {
    result: ApiResult.SUCCESS,
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
  const response: ApiResponse<null> = {
    result: ApiResult.ERROR,
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
  const response: ApiResponse<null> = {
    result: ApiResult.NOOP,
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
  error: unknown,
  operation: string
): void => {
  console.error(`Error in ${operation}:`, error)
  const message =
    error instanceof Error ? error.message : `Failed to ${operation}`
  sendError(res, message)
}
