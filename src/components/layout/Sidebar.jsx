import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Calendar,
  Users,
  CalendarDays,
  MapPin,
  DollarSign,
  Settings,
  Globe,
  X,
} from 'lucide-react'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/calendar', icon: Calendar, label: 'Year Arc' },
  { to: '/speakers', icon: Users, label: 'Speakers' },
  { to: '/events', icon: CalendarDays, label: 'Events' },
  { to: '/venues', icon: MapPin, label: 'Venues' },
  { to: '/budget', icon: DollarSign, label: 'Budget' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export default function Sidebar({ isOpen, onClose, onNavigate }) {
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
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold tracking-tight">EO Learning Chair</h1>
            <p className="text-xs text-white/50 mt-1">Command Center</p>
          </div>
          <button
            onClick={onClose}
            className="md:hidden text-white/50 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => (
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
        </nav>

        {/* Member Calendar Link */}
        <div className="px-4 pb-2">
          <NavLink
            to="/member-calendar"
            onClick={onNavigate}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-white/50 hover:bg-white/10 hover:text-white transition-colors"
          >
            <Globe className="h-3.5 w-3.5" />
            Member Calendar Preview
          </NavLink>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10">
          <div className="text-xs text-white/40">
            <p>EO Arizona</p>
            <p className="mt-1">FY 2026–2027</p>
          </div>
        </div>
      </aside>
    </>
  )
}
