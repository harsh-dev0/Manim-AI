"use client"

import { useSession } from "next-auth/react"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

interface RouteProtectionProps {
  children: React.ReactNode
  authRequired?: boolean
  redirectTo?: string
}

/**
 * Component for protecting routes based on authentication status
 * @param children - The content to render if access is allowed
 * @param authRequired - If true, redirects unauthenticated users. If false, redirects authenticated users.
 * @param redirectTo - The path to redirect to if access is denied
 */
const RouteProtection: React.FC<RouteProtectionProps> = ({
  children,
  authRequired = true,
  redirectTo = "/",
}) => {
  const { data: session, status } = useSession()
  const router = useRouter()
  const isLoading = status === "loading"
  const isAuthenticated = !!session?.user

  useEffect(() => {
    // Skip redirection while loading
    if (isLoading) return

    // Redirect if:
    // 1. Auth is required but user is not authenticated
    // 2. Auth is not required but user is authenticated (e.g., sign-in page)
    if (
      (authRequired && !isAuthenticated) ||
      (!authRequired && isAuthenticated)
    ) {
      router.replace(redirectTo)
    }
  }, [isLoading, isAuthenticated, authRequired, redirectTo, router])

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-950 to-slate-900">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-cyan-500 animate-spin" />
          <p className="text-slate-300">Loading your gallery...</p>
        </div>
      </div>
    )
  }

  // If auth is required and user is not authenticated, or
  // if auth is not required and user is authenticated,
  // don't render children (we're redirecting)
  if (
    (authRequired && !isAuthenticated) ||
    (!authRequired && isAuthenticated)
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-950 to-slate-900">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-cyan-500 animate-spin" />
          <p className="text-slate-300">Redirecting...</p>
        </div>
      </div>
    )
  }

  // Otherwise, render the children
  return <>{children}</>
}

export default RouteProtection
