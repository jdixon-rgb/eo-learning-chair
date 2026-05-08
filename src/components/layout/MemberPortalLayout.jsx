import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { ADMIN_LAYOUT_ROLES } from '@/lib/permissions'
import { Compass, Calendar, Bell, LogOut, Menu, X, ArrowLeft, Users, Store } from 'lucide-react'
import { useState } from 'react'
import { APP_VERSION } from '@/lib/version'
import { isStaging } from '@/lib/env'
import BuiltByFooter from '@/components/BuiltByFooter'

const portalNav = [
  { to: '/portal', icon: Compass, label: 'Home', end: true },
  { to: '/portal/forum', icon: Users, label: 'Forum' },
  { to: '/portal/calendar', icon: Calendar, label: 'Calendar' },
  { to: '/portal/vendors', icon: Store, label: 'Vendors' },
  { to: '/portal/notifications', icon: Bell, label: 'Notifications' },
]

export default function MemberPortalLayout() {
  const { profile, signOut, isSuperAdmin, isImpersonating, setViewAsRole } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  // When an admin/super-admin was impersonating a member and clicks
  // "Admin" to go back, clear the impersonation so they return to
  // their own surface (not an empty 'member' chair config in the
  // admin sidebar).
  const exitImpersonation = () => {
    if (isImpersonating) setViewAsRole(null)
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top Nav — light theme, community-green accent strip */}
      <header className="border-b bg-card sticky top-0 z-50 shadow-sm">
        {/* Accent strip — community green — context cue */}
        <div className="h-1 bg-community" />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          {/* Left: Brand + context chip */}
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-base font-semibold tracking-tight whitespace-nowrap">
              <span className="text-community">Our</span>Chapter OS
            </span>
            <span className="text-[10px] font-bold tracking-widest uppercase text-community bg-community/10 px-2 py-0.5 rounded shrink-0">
              Member
            </span>
            {isSuperAdmin && !isImpersonating && (
              <span className="text-xs font-bold tracking-tight text-warm shrink-0">Super Admin</span>
            )}
          </div>

          {/* Right: User + hamburger (nav consolidated into dropdown) */}
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs text-muted-foreground hidden sm:inline truncate max-w-[180px]">
              {profile?.full_name || profile?.email}
            </span>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted transition-colors cursor-pointer"
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Nav dropdown — all breakpoints */}
        {mobileOpen && (
          <div className="border-t px-4 py-3 space-y-1 bg-card">
            {portalNav.map(({ to, icon: Icon, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-community text-community-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`
                }
              >
                <Icon className="h-4 w-4" />
                {label}
              </NavLink>
            ))}
            {profile?.role && ADMIN_LAYOUT_ROLES.includes(profile.role) && (
              <NavLink
                to="/"
                onClick={() => { setMobileOpen(false); exitImpersonation() }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-warm hover:bg-muted transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Admin Dashboard
              </NavLink>
            )}
            <button
              onClick={handleSignOut}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors w-full cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        )}
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 flex-1">
        <Outlet />
      </main>

      {/* Version footer + builder attribution */}
      <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 text-center pb-2">
        <span className="text-[10px] text-muted-foreground/60">
          {isStaging && <span className="font-semibold text-staging mr-1">staging</span>}
          v{APP_VERSION}
        </span>
      </div>
      <BuiltByFooter />
    </div>
  )
}
