import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { useChapter } from '@/lib/chapter'
import { hasPermission } from '@/lib/permissions'
import { getChairConfig, SWITCHABLE_CHAIR_ROLES, CHAIR_ROLE_CONFIGS } from '@/lib/chairRoles'
import ChapterSwitcher from '@/components/ChapterSwitcher'
import FiscalYearSwitcher from '@/components/FiscalYearSwitcher'
import {
  Globe,
  X,
  LogOut,
  Shield,
  ClipboardList,
  Bell,
  MessageSquarePlus,
  Briefcase,
  FileText,
  Mail,
  Users2,
  BarChart3,
  ClipboardCheck,
  Eye,
} from 'lucide-react'
import eoLogo from '@/assets/eo-az-gray.png'
import { APP_VERSION } from '@/lib/version'

// Admin sub-pages
const adminItems = [
  { to: '/admin/members', icon: Shield, label: 'Members', permission: 'canManageMembers' },
  { to: '/admin/surveys', icon: ClipboardList, label: 'Survey Results', permission: 'canViewSurveyResults' },
  { to: '/admin/notifications', icon: Bell, label: 'Notifications', permission: 'canSendNotifications' },
  { to: '/coordinator', icon: ClipboardCheck, label: 'Coordinator', permission: 'canViewCoordinator' },
]

// Board management pages
const boardItems = [
  { to: '/board', icon: Briefcase, label: 'Board Dashboard', permission: 'canViewBoard' },
  { to: '/board/reports', icon: FileText, label: 'Chair Reports', permission: 'canManageChairReports' },
  { to: '/board/communications', icon: Mail, label: 'Communications', permission: 'canManageComms' },
  { to: '/board/forums', icon: Users2, label: 'Forums', permission: 'canManageForums' },
  { to: '/board/scorecards', icon: BarChart3, label: 'Scorecards', permission: 'canViewScorecards' },
]

export default function Sidebar({ isOpen, onClose, onNavigate }) {
  const { profile, effectiveRole, signOut, isSuperAdmin, isPresident, canSwitchRoles, isImpersonating, viewAsRole, setViewAsRole } = useAuth()
  const { activeChapter } = useChapter()
  const navigate = useNavigate()

  // Look up the chair-role config for the *effective* role.
  // For super admins not impersonating, default to Learning Chair surface.
  const chairConfig = getChairConfig(effectiveRole)

  const visibleNav = chairConfig.navItems.filter(item =>
    !item.permission || hasPermission(effectiveRole, item.permission)
  )

  const visibleAdmin = adminItems.filter(item =>
    !item.permission || hasPermission(effectiveRole, item.permission)
  )

  const visibleBoard = boardItems.filter(item =>
    !item.permission || hasPermission(effectiveRole, item.permission)
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
            {isSuperAdmin && !isImpersonating ? (
              <>
                <div className="flex items-center gap-2">
                  <h1 className="text-sm font-bold tracking-tight text-white/90">Super Admin</h1>
                  <span className="text-[9px] font-bold bg-amber-500/90 text-black px-1.5 py-0.5 rounded uppercase tracking-wider">SA</span>
                </div>
                <p className="text-[10px] text-white/40">
                  {activeChapter ? activeChapter.name : 'Platform'}
                </p>
              </>
            ) : (
              <>
                <h1 className="text-sm font-bold tracking-tight text-white/90">{chairConfig.title}</h1>
                <p className="text-[10px] text-white/40">
                  {activeChapter ? activeChapter.name : 'Command Center'}
                </p>
              </>
            )}
          </div>
        </div>

        {/* Chapter Switcher (super admin only) */}
        <div className="pt-3">
          <ChapterSwitcher />
        </div>

        {/* Fiscal Year Switcher */}
        <div className="pt-2">
          <FiscalYearSwitcher />
        </div>

        {/* Role switcher — super admin + president */}
        {canSwitchRoles && (
          <div className="px-4 pt-2">
            <label className="flex items-center gap-1.5 text-[10px] font-bold tracking-widest text-white/30 uppercase mb-1">
              <Eye className="h-3 w-3" />
              Switch role
            </label>
            <select
              value={viewAsRole || ''}
              onChange={e => {
                setViewAsRole(e.target.value || null)
                const fallbackConfig = isSuperAdmin ? CHAIR_ROLE_CONFIGS.super_admin : CHAIR_ROLE_CONFIGS.president
                const config = e.target.value
                  ? CHAIR_ROLE_CONFIGS[e.target.value]
                  : fallbackConfig
                if (config?.homePath) navigate(config.homePath)
              }}
              className="w-full text-xs bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white/80 focus:outline-none focus:ring-1 focus:ring-eo-blue/50"
            >
              <option value="">{isSuperAdmin ? 'Super Admin' : (CHAIR_ROLE_CONFIGS[profile?.role]?.title || 'My Role')}</option>
              {SWITCHABLE_CHAIR_ROLES.filter(r => r !== profile?.role).map(r => (
                <option key={r} value={r}>{CHAIR_ROLE_CONFIGS[r].title}</option>
              ))}
            </select>
            {isImpersonating && (
              <button
                onClick={() => {
                  setViewAsRole(null)
                  const config = isSuperAdmin ? CHAIR_ROLE_CONFIGS.super_admin : CHAIR_ROLE_CONFIGS[profile?.role]
                  navigate(config?.homePath || '/')
                }}
                className="mt-1.5 w-full text-[10px] text-amber-300/80 hover:text-amber-200 underline"
              >
                Back to {isSuperAdmin ? 'Super Admin' : (CHAIR_ROLE_CONFIGS[profile?.role]?.title || 'My Role')}
              </button>
            )}
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {visibleNav.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/' || to === chairConfig.homePath}
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

          {/* Board section */}
          {visibleBoard.length > 0 && (
            <>
              <div className="pt-4 pb-2 px-3">
                <p className="text-[10px] font-bold tracking-widest text-white/30 uppercase">Board</p>
              </div>
              {visibleBoard.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/board'}
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

          {/* Super Admin section — only when viewing-as a chair role */}
          {isSuperAdmin && isImpersonating && (
            <>
              <div className="pt-4 pb-2 px-3">
                <p className="text-[10px] font-bold tracking-widest text-white/30 uppercase">Platform</p>
              </div>
              <NavLink
                to="/super-admin"
                onClick={onNavigate}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-eo-blue text-white'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }`
                }
              >
                <Shield className="h-4 w-4" />
                Platform Admin
              </NavLink>
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
            to="/portal"
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
            <span className="text-[10px] text-white/50">v{APP_VERSION}</span>
          </div>
        </div>
      </aside>
    </>
  )
}
