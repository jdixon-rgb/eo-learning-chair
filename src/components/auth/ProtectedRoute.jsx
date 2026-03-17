import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { Loader2 } from 'lucide-react'

export default function ProtectedRoute({ allowedRoles, children }) {
  const { session, profile, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-eo-blue" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Not authenticated — redirect to login
  if (!session && !profile) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Authenticated but wrong role — redirect to appropriate home
  // Super admins can access everything
  if (allowedRoles && profile && profile.role !== 'super_admin' && !allowedRoles.includes(profile.role)) {
    const home = profile.role === 'member' ? '/portal' : '/'
    return <Navigate to={home} replace />
  }

  return children
}
