import { useEffect } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useQueryClient } from "@tanstack/react-query"

/**
 * Hook to handle post-authentication redirects
 * Checks for a redirect parameter in the URL and navigates to it after auth
 */
export const useAuthRedirect = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const queryClient = useQueryClient()

  useEffect(() => {
    const redirectPath = searchParams.get("redirect")
    
    if (redirectPath) {
      // Validate that the redirect is a relative path (security)
      if (redirectPath.startsWith("/") && !redirectPath.startsWith("//")) {
        // Remove the redirect param from the URL
        const newSearchParams = new URLSearchParams(searchParams)
        newSearchParams.delete("redirect")
        
        // Invalidate user query to ensure fresh auth state
        queryClient.invalidateQueries({ queryKey: ["user"] })
        
        // Navigate to the original location
        navigate(redirectPath, { replace: true })
      }
    }
  }, [searchParams, navigate, queryClient])
}