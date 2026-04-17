import { Outlet, Link } from 'react-router-dom'
import MockModeBanner from '@/components/MockModeBanner'
import { useAuth } from '@/lib/auth'

// Minimal layout for the /demo surface — no chapter-scoped sidebar, just the
// Mock Mode banner, a lightweight header, and the page body. Used whenever a
// super-admin is in mock mode or a demo_user is browsing.
export default function DemoLayout() {
  const { isSuperAdmin, isDemoUser } = useAuth()
  return (
    <div className="min-h-screen bg-background">
      <MockModeBanner />
      <div className="border-b bg-card shadow-sm">
        <div className="px-6 py-3 flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">EO Platform</span>
            <span className="text-xs text-muted-foreground">· Regional & Global Demo</span>
          </div>
          {isSuperAdmin && !isDemoUser && (
            <Link
              to="/super-admin"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Back to Super Admin
            </Link>
          )}
        </div>
      </div>
      <main className="p-6 max-w-7xl mx-auto">
        <Outlet />
      </main>
    </div>
  )
}
