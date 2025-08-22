// Export the main HelpaApi class
export { HelpaApi } from "./client"

// Export types
export * from "./types"

// Re-export AxiosError as ApiError for consumers
export { AxiosError as ApiError } from "axios"
