import { AxiosInstance, AxiosResponse } from "axios"
import { ApiResult, ApiResponse } from "@helpasaur/types"

/**
 * Base class providing common API functionality and helper methods
 * for all route-specific API classes
 */
export abstract class ApiBase {
  protected readonly api: AxiosInstance

  constructor(api: AxiosInstance) {
    this.api = api
  }

  /**
   * Helper function to handle API responses that return data
   * @param response - The axios response object
   * @returns The data from the response
   * @throws Error if the response indicates an error
   */
  protected handleDataResponse<T>(response: AxiosResponse<ApiResponse<T>>): T {
    if (response.data.result === ApiResult.ERROR) {
      throw new Error(response.data.message || "API request failed")
    }

    if (
      response.data.result === ApiResult.SUCCESS &&
      response.data.data !== undefined
    ) {
      return response.data.data
    }

    // Handle NOOP or SUCCESS without data - should not happen for data responses
    throw new Error(response.data.message || "No data returned from API")
  }

  /**
   * Helper function to handle API responses that return void
   * @param response - The axios response object
   * @throws Error if the response indicates an error
   */
  protected handleVoidResponse(response: AxiosResponse<ApiResponse>): void {
    if (response.data.result === ApiResult.ERROR) {
      throw new Error(response.data.message || "API request failed")
    }
    // SUCCESS and NOOP are both treated as success for void operations
  }

  /**
   * Helper function to execute GET requests
   * @param endpoint - The API endpoint to call
   * @returns Promise with the data from the response
   */
  protected async apiGet<T>(endpoint: string): Promise<T> {
    const response = await this.api.get(endpoint)
    return this.handleDataResponse(response)
  }

  /**
   * Helper function to execute POST requests
   * @param endpoint - The API endpoint to call
   * @param data - The data to send in the request body
   * @returns Promise with the data from the response or void
   */
  protected async apiPost<T = void>(endpoint: string, data: any): Promise<T> {
    const response = await this.api.post(endpoint, data)
    return this.handleResponse(response)
  }

  /**
   * Helper function to execute PATCH requests
   * @param endpoint - The API endpoint to call
   * @param data - The data to send in the request body
   * @returns Promise with the data from the response or void
   */
  protected async apiPatch<T = void>(endpoint: string, data: any): Promise<T> {
    const response = await this.api.patch(endpoint, data)
    return this.handleResponse(response)
  }

  /**
   * Helper function to execute DELETE requests
   * @param endpoint - The API endpoint to call
   * @param data - Optional data to send in the request body
   * @returns Promise with void
   */
  protected async apiDelete(endpoint: string, data?: any): Promise<void> {
    const response = await this.api.delete(
      endpoint,
      data ? { data } : undefined
    )
    return this.handleResponse(response)
  }

  /**
   * Generic response handler that works for both data and void responses
   * @param response - The axios response object
   * @returns The data from the response or void
   */
  private handleResponse<T>(response: AxiosResponse<ApiResponse<T>>): T {
    if (response.data.result === ApiResult.ERROR) {
      throw new Error(response.data.message || "API request failed")
    }

    if (response.data.result === ApiResult.SUCCESS) {
      return response.data.data as T
    }

    // NOOP is treated as success
    return response.data.data as T
  }
}
