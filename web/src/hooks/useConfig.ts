import { useQuery } from "@tanstack/react-query"
import { getConfig } from "../utils/apiService"

/**
 * Hook for fetching and caching web configuration data
 */
export const useConfig = () => {
  return useQuery({
    queryKey: ["config"],
    queryFn: getConfig,
    staleTime: 60 * 60 * 1000, // 1 hour
  })
}
