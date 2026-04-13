import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { useSAPContact } from '@/lib/useSAPContact'
import { LayoutDashboard, CalendarDays, Building2, FileText, Bell, LogOut, Menu, X, Users, Star, MessageSquare, ArrowLeft } from 'lucide-react'
import { ADMIN_LAYOUT_ROLES } from '@/lib/permissions'
import { useState } from 'react'
import eoLogo from '@/assets/eo-az-gray.png'
import { APP_VERSION } from '@/lib/version'

const sapNav = [
  { to: '/sap-portal', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/sap-portal/events', icon: CalendarDays, label: 'Events' },
  { to: '/sap-portal/leads', icon: Users, label: 'Leads' },
  { to: '/sap-portal/reviews', icon: Star, label: 'Reviews' },
  { to: '/sap-portal/profile', icon: Building2, label: 'Our Profile' },
  { to: '/sap-portal/feedback', icon: MessageSquare, label: 'Feedback' },
  { to: '/sap-portal/resources', icon: FileText, label: 'Resources' },
  { to: '/sap-portal/announcements', icon: Bell, label: 'Announcements' },
]

export default function SAPPortalLayout() {
  const { profile, signOut, isImpersonating, viewAsSapContactId, setViewAsSapContactId, setViewAsRole } = useAuth()
  const { partner, contact } = useSAPContact()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-eo-navy via-[#121248] to-eo-navy text-white">
      {/* Top Nav */}
      <header className="border-b border-white/10 bg-eo-navy/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          {/* Left: Brand + Partner */}
          <div className="flex items-center gap-3">
            <img src={eoLogo} alt="EO Arizona" className="h-8 w-auto" />
            {partner && (
              <span className="text-xs font-semibold text-indigo-300 tracking-tight hidden sm:inline">
                {partner.name}
              </span>
            )}
          </div>

          {/* Center: Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {sapNav.map(({ to, icon: Icon, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-indigo-600 text-white'
                      : 'text-white/60 hover:bg-white/10 hover:text-white'
                  }`
                }
              >
                <Icon className="h-4 w-4" />
                {label}
              </NavLink>
            ))}
          </nav>

          {/* Right: User + Sign out */}
          <div className="flex items-center gap-3">
            {profile?.role && ADMIN_LAYOUT_ROLES.includes(profile.role) && (
              <NavLink
                to="/"
                onClick={() => { setViewAsSapContactId(null); setViewAsRole(null) }}
                className="text-xs text-amber-300 hover:text-amber-200 font-medium flex items-center gap-1 transition-colors"
              >
                <ArrowLeft className="h-3 w-3" />
                Admin
              </NavLink>
            )}
            <span className="text-xs text-white/50 hidden sm:inline">
              {profile?.full_name || profile?.email}
            </span>
            <button
              onClick={handleSignOut}
              className="text-white/40 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer hidden md:block"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden text-white/60 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile nav dropdown */}
        {mobileOpen && (
          <div className="md:hidden border-t border-white/10 px-4 py-3 space-y-1 bg-eo-navy/95 backdrop-blur-sm">
            {sapNav.map(({ to, icon: Icon, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-indigo-600 text-white'
                      : 'text-white/60 hover:bg-white/10 hover:text-white'
                  }`
                }
              >
                <Icon className="h-4 w-4" />
                {label}
              </NavLink>
            ))}
            <button
              onClick={handleSignOut}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/40 hover:bg-white/10 hover:text-white transition-colors w-full cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        )}
      </header>

      {/* Impersonation banner */}
      {isImpersonating && viewAsSapContactId && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <span className="text-xs text-amber-300">
              Viewing as <strong>{contact?.name}</strong> — {partner?.name}
            </span>
            <button
              onClick={() => { setViewAsSapContactId(null); setViewAsRole(null); navigate('/super-admin') }}
              className="text-xs text-amber-300 hover:text-amber-200 underline cursor-pointer"
            >
              Exit Preview
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto px-4 sm:px-6 pb-6 text-center">
        <span className="text-[10px] text-white/15">v{APP_VERSION}</span>
      </footer>
    </div>
  )
}
