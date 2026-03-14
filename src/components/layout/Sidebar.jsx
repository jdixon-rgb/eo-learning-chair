import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import {
  LayoutDashboard,
  Calendar,
  Users,
  CalendarDays,
  MapPin,
  DollarSign,
  Shuffle,
  Settings,
  Globe,
  X,
  LogOut,
  Shield,
  ClipboardList,
  Bell,
  MessageSquarePlus,
} from 'lucide-react'
import eoLogo from '@/assets/eo-az-gray.png'
import { APP_VERSION } from '@/lib/version'

// Base nav items with optional permission keys
const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/calendar', icon: Calendar, label: 'Year Arc' },
  { to: '/speakers', icon: Users, label: 'Speakers' },
  { to: '/events', icon: CalendarDays, label: 'Events' },
  { to: '/venues', icon: MapPin, label: 'Venues', permission: 'canViewVenues' },
  { to: '/budget', icon: DollarSign, label: 'Budget', permission: 'canViewBudget' },
  { to: '/scenarios', icon: Shuffle, label: 'Scenarios', permission: 'canViewScenarios' },
  { to: '/settings', icon: Settings, label: 'Settings', permission: 'canManageSettings' },
]

// Admin sub-pages
const adminItems = [
  { to: '/admin/members', icon: Shield, label: 'Members', permission: 'canManageMembers' },
  { to: '/admin/surveys', icon: ClipboardList, label: 'Survey Results', permission: 'canViewSurveyResults' },
  { to: '/admin/notifications', icon: Bell, label: 'Notifications', permission: 'canSendNotifications' },
]

export default function Sidebar({ isOpen, onClose, onNavigate }) {
  const { profile, role, signOut } = useAuth()
  const navigate = useNavigate()

  const visibleNav = navItems.filter(item =>
    !item.permission || hasPermission(role, item.permission)
  )

  const visibleAdmin = adminItems.filter(item =>
    !item.permission || hasPermission(role, item.permission)
  )

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <>
      {/* Backdrop overlay — mobile only */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={`
          fixed left-0 top-0 bottom-0 w-64 bg-eo-navy text-white flex flex-col z-50
          transition-transform duration-200 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0
        `}
      >
        {/* Logo / Title + Close button */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between">
            <img src={eoLogo} alt="EO Arizona" className="h-10 w-auto brightness-0 invert opacity-80" />
            <button
              onClick={onClose}
              className="md:hidden text-white/50 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-3">
            <h1 className="text-sm font-bold tracking-tight text-white/90">Learning Chair</h1>
            <p className="text-[10px] text-white/40">Command Center</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {visibleNav.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={onNavigate}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-eo-blue text-white'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}

          {/* Admin section divider */}
          {visibleAdmin.length > 0 && (
            <>
              <div className="pt-4 pb-2 px-3">
                <p className="text-[10px] font-bold tracking-widest text-white/30 uppercase">Admin</p>
              </div>
              {visibleAdmin.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-eo-blue text-white'
                        : 'text-white/70 hover:bg-white/10 hover:text-white'
                    }`
                  }
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </NavLink>
              ))}
            </>
          )}
        </nav>

        {/* Bottom links */}
        <div className="px-4 pb-2 space-y-1">
          <NavLink
            to="/feedback"
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors ${
                isActive
                  ? 'bg-eo-blue text-white'
                  : 'text-white/50 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            <MessageSquarePlus className="h-3.5 w-3.5" />
            Suggestion | Report Bug
          </NavLink>
          <NavLink
            to="/portal/calendar"
            onClick={onNavigate}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-white/50 hover:bg-white/10 hover:text-white transition-colors"
          >
            <Globe className="h-3.5 w-3.5" />
            Member Portal
          </NavLink>
        </div>

        {/* Footer: User info + Sign out */}
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-white/80 truncate">
                {profile?.full_name || 'User'}
              </p>
              <p className="text-[10px] text-white/40 truncate">
                {profile?.email || role || 'EO Arizona'}
              </p>
            </div>
            <button
              onClick={handleSignOut}
              title="Sign out"
              className="text-white/30 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer shrink-0"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3 border-t border-white/10 pt-2 text-center">
            <span className="text-[10px] text-white/20">v{APP_VERSION}</span>
          </div>
        </div>
      </aside>
    </>
  )
}
