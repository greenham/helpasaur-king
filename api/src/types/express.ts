import { Request } from "express"

/**
 * Request with JWT authentication data attached by middleware
 */
export interface AuthenticatedRequest extends Request {
  user?: {
    sub?: string
    permissions?: string[]
  }
}

/**
 * Request from a service with authentication
 */
export interface ServiceRequest extends AuthenticatedRequest {
  user: {
    sub: string
    permissions: string[]
  }
}
