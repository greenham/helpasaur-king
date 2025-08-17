/**
 * API Response Types for Helpasaur King
 * These types define the standardized response format used across all API endpoints
 */

export enum ApiResult {
  SUCCESS = "success",
  ERROR = "error",
  NOOP = "noop",
}

export interface ApiResponse<T = any> {
  result: ApiResult
  message?: string
  data?: T
}
