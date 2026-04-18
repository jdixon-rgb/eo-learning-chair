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
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
  // Super admins, president-level roles, and chapter staff can access everything
  // (they switch into chair views for chapter-wide support)
  const bypassRoles = ['super_admin', 'president', 'president_elect', 'president_elect_elect', 'chapter_executive_director', 'chapter_experience_coordinator']
  if (allowedRoles && profile && !bypassRoles.includes(profile.role) && !allowedRoles.includes(profile.role)) {
    const home = profile.role === 'member' ? '/portal'
               : profile.role === 'sap_contact' ? '/sap-portal'
               : '/'
    return <Navigate to={home} replace />
  }

  return children
}
