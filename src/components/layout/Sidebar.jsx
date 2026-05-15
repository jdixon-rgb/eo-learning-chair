import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { useChapter } from '@/lib/chapter'
import { useFiscalYear } from '@/lib/fiscalYearContext'
import { hasPermission } from '@/lib/permissions'
import { getChairConfig, SWITCHABLE_CHAIR_ROLES, CHAIR_ROLE_CONFIGS } from '@/lib/chairRoles'
import { useSAPStore } from '@/lib/sapStore'
import { useIsModerator } from '@/lib/useIsModerator'
import { useTourTips } from '@/lib/useTourTips'
import FiscalYearSwitcher from '@/components/FiscalYearSwitcher'
import ChapterSwitcher from '@/components/ChapterSwitcher'
import { useState } from 'react'
import {
  X,
  LogOut,
  Shield,
  UserCog,
  Heart,
  Handshake,
  MessageSquarePlus,
  Lightbulb,
  Briefcase,
  FileText,
  Mail,
  Users,
  Users2,
  Store,
  Sparkles,
  GraduationCap,
  BarChart3,
  ClipboardCheck,
  ClipboardList,
  ScrollText,
  Pin,
  Calendar as CalendarIcon,
  CalendarDays,
  Eye,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Settings as SettingsIcon,
  History as HistoryIcon,
} from 'lucide-react'

const CONTEXT_EXPANDED_KEY = 'eo-sidebar-context-expanded'
import Wordmark from '@/components/Wordmark'
import { APP_VERSION } from '@/lib/version'
import { isStaging } from '@/lib/env'

// Active-nav highlight color. Orange on staging so the active item is
// a glance-able env signal; otherwise the brand céruléen.
const activeNavClass = isStaging
  ? 'bg-staging text-staging-foreground'
  : 'bg-primary text-primary-foreground'

// Default tab for /portal/forum when no ?tab= is present. Mirrors the
// initialTab logic in ForumHomePage.
const FORUM_DEFAULT_TAB = 'members'

// Children that deep-link via query string (e.g. /portal/forum?tab=members)
// need active-state matching that considers the tab param, not just the
// pathname. Plain-path children fall back to a simple pathname match.
function isChildActive(childTo, location) {
  const qIdx = childTo.indexOf('?')
  if (qIdx === -1) return location.pathname === childTo
  const childPath = childTo.slice(0, qIdx)
  if (location.pathname !== childPath) return false
  const childTab = new URLSearchParams(childTo.slice(qIdx)).get('tab')
  const currentTab = new URLSearchParams(location.search).get('tab') || FORUM_DEFAULT_TAB
  return childTab === currentTab
}

// Admin sub-pages.
// Survey Results moved to the Learning Chair's main nav. Notifications
// moved to a bell icon in the TopBar (upper right).
const adminItems = [
  { to: '/admin/members', icon: Shield, label: 'Members', permission: 'canManageMembers' },
  { to: '/admin/staff', icon: UserCog, label: 'Staff', permission: 'canManageMembers' },
  { to: '/admin/slps', icon: Heart, label: 'SLPs', permission: 'canManageMembers' },
  { to: '/partners', icon: Handshake, label: 'SAPs', permission: 'canManageMembers' },
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

// Member-section sub-pages. Every chair (except staff) is also a member,
// so this section gives them a one-click path into their personal forum
// experience without leaving the chair shell. Forum is permanently
// expanded so Reflections / Lifeline / Parking Lot are visible to every
// member the moment they sign in.
const memberItems = [
  {
    to: '/portal/forum',
    icon: Users,
    label: 'Forum',
    // alwaysExpanded: children always visible regardless of route, so
    // every member who can see this section gets one-click access to
    // every forum surface the moment they sign in. The previous
    // route-driven auto-expand kept these tools invisible until the
    // user already knew to click Forum.
    alwaysExpanded: true,
    children: [
      { to: '/portal/reflections', icon: Sparkles, label: 'Reflections' },
      { to: '/portal/lifeline', icon: Heart, label: 'Lifeline' },
      { to: '/portal/parking', icon: Pin, label: 'Parking Lot' },
      { to: '/portal/forum?tab=members', icon: Users2, label: 'Members' },
      { to: '/portal/forum?tab=partners', icon: Handshake, label: 'SAP Interest' },
      { to: '/portal/forum?tab=constitution', icon: ScrollText, label: 'Constitution' },
      { to: '/portal/forum?tab=calendar', icon: CalendarIcon, label: 'Calendar' },
      { to: '/portal/forum?tab=agenda', icon: ClipboardList, label: 'Agenda' },
      { to: '/portal/forum?tab=history', icon: HistoryIcon, label: 'History' },
    ],
  },
  // Chapter-wide member directory with bulk "Save to Contacts" — pulls
  // every member into the user's phone address book so WhatsApp /
  // Messages / Mail auto-resolve them by name.
  { to: '/portal/directory', icon: Users2, label: 'Directory' },
  // Vendors is the broader catalog. SAPs (formal partners) don't get
  // their own sidebar entry — inside /portal/vendors they rise to the
  // top of each category and are flagged with a shield/badge so members
  // see the "preferred / supported" partners first. See
  // memory/project_vendors_vs_saps.md.
  { to: '/portal/vendors', icon: Store, label: 'Vendors' },
  { to: '/portal/calendar', icon: GraduationCap, label: 'Learning' },
]

// Roles that don't get a Member section in the sidebar. Staff are staff
// (ED + Coordinator have no forum life inside the product). SAP contacts
// have their own external-partner portal. Super-admin not-impersonating
// is platform-level — switch into a chair role first to see member surfaces.
const NON_MEMBER_ROLES = new Set([
  'chapter_executive_director',
  'chapter_experience_coordinator',
  'sap_contact',
])

// Moderator section — only renders when useIsModerator() returns true.
// Treated like a board role: the moderator gets menu items the average
// member never sees (forum agenda, forum calendar, forum members &
// roles, manage constitution) plus the back-of-house moderator events
// calendar for monthly moderator meetings + annual regional summit.
//
// Each forum sub-item is its own dedicated route that renders
// ForumHomePage in `focusTab` mode — single tab, page-specific
// header, no nested tab strip. Moderator Events is a separate page.
const moderatorItems = [
  { to: '/portal/moderator/agenda', icon: ClipboardList, label: 'Forum Agenda' },
  { to: '/portal/moderator/calendar', icon: CalendarIcon, label: 'Forum Calendar' },
  { to: '/portal/moderator/parking', icon: Pin, label: 'Manage Parking Lot' },
  { to: '/portal/moderator/members', icon: Users2, label: 'Forum Members & Roles' },
  { to: '/portal/moderator/constitution', icon: ScrollText, label: 'Manage Constitution' },
  { to: '/portal/moderator/events', icon: CalendarDays, label: 'Moderator Events' },
]

export default function Sidebar({ isOpen, onClose, onNavigate }) {
  const { profile, effectiveRole, signOut, isSuperAdmin, isPresident, canSwitchRoles, isImpersonating, viewAsRole, setViewAsRole, viewAsSapContactId, setViewAsSapContactId, viewAsRegion, setViewAsRegion } = useAuth()
  const { activeChapter, allChapters } = useChapter()
  const { activeFiscalYear } = useFiscalYear()
  const { partners: sapPartners, contacts: sapContacts } = useSAPStore()
  const { isModerator } = useIsModerator()
  const { resetAll: resetTourTips } = useTourTips()
  const navigate = useNavigate()
  const location = useLocation()

  // Collapsible context switcher block (Chapter / FY / Switch Role).
  // Always defaults collapsed on page load — expansion is a temporary
  // action, not a persistent preference. That matches the "get it out
  // of the way during regular work" goal.
  const [contextExpanded, setContextExpanded] = useState(() => {
    // Clear any stale flag from an older build that used to persist
    // expansion — some users were stuck expanded across sessions.
    try { localStorage.removeItem(CONTEXT_EXPANDED_KEY) } catch { /* ignore */ }
    return false
  })
  const toggleContext = () => setContextExpanded(prev => !prev)

  // Look up the chair-role config for the *effective* role.
  // For super admins not impersonating, default to Learning Chair surface.
  const chairConfig = getChairConfig(effectiveRole)

  const visibleNav = chairConfig.navItems.filter(item =>
    !item.permission || hasPermission(effectiveRole, item.permission)
  )

  // Suppress chapter-operational sub-sections (Admin / Board) from the
  // Super Admin surface — super-admin focuses on platform-level concerns.
  // Super-admins role-switch into a chair view to access those operations.
  const hideChapterOps = isSuperAdmin && !isImpersonating

  const visibleAdmin = hideChapterOps ? [] : adminItems.filter(item =>
    !item.permission || hasPermission(effectiveRole, item.permission)
  )

  const visibleBoard = hideChapterOps ? [] : boardItems.filter(item =>
    !item.permission || hasPermission(effectiveRole, item.permission)
  )

  // Member section visibility: hidden for staff and SAP partner contacts;
  // hidden for super-admin when not impersonating (they're not "in" a
  // chapter as a member at the platform level).
  const showMemberSection = !hideChapterOps && !NON_MEMBER_ROLES.has(effectiveRole)

  // Moderator section: only when this user actually moderates a forum.
  // Hidden for staff / SAP contacts / non-impersonating super-admin
  // (they have no member identity in this chapter context). Admins are
  // intentionally NOT auto-shown — they get into moderator views via
  // role-switching, not by virtue of admin status.
  const showModeratorSection = !hideChapterOps && !NON_MEMBER_ROLES.has(effectiveRole) && isModerator

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
          fixed left-0 top-0 bottom-0 w-64 bg-sidebar text-sidebar-foreground flex flex-col z-50
          transition-transform duration-200 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0
        `}
      >
        {/* Logo / Title + Close button */}
        <div className="p-6 border-b border-sidebar-border">
          <div className="flex items-center justify-between">
            <Wordmark size="lg" />
            <button
              onClick={onClose}
              className="md:hidden text-muted-foreground hover:text-sidebar-foreground p-1 rounded-lg hover:bg-sidebar-accent transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          {/* Chapter name in bold directly under the wordmark. Chair
              title lives in the collapsible context block below so we
              don't repeat it at the top of the navigation. Super Admin
              platform surface shows "Platform" + the SA chip instead. */}
          <div className="mt-3">
            {isSuperAdmin && !isImpersonating ? (
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold tracking-tight text-sidebar-foreground">Platform</h1>
                <span className="text-[9px] font-bold bg-amber-500/90 text-black px-1.5 py-0.5 rounded uppercase tracking-wider">SA</span>
              </div>
            ) : (
              <h1 className="text-sm font-bold tracking-tight text-sidebar-foreground">
                {activeChapter ? activeChapter.name : 'OurChapter OS'}
              </h1>
            )}
          </div>
        </div>

        {/* Collapsible context block — compact summary when closed,
            full switchers when expanded. Keeps the sidebar usable as a
            nav surface once context is set. */}
        <div className="border-b border-sidebar-border">
          <button
            type="button"
            onClick={toggleContext}
            className="w-full px-4 py-2 flex items-center gap-2 hover:bg-sidebar-accent/50 transition-colors"
            aria-expanded={contextExpanded}
          >
            <SettingsIcon className="h-3 w-3 text-muted-foreground shrink-0" />
            <span className="flex-1 text-left text-[11px] text-muted-foreground truncate">
              {/* Chapter name already lives in the TopBar — no need to
                  restate it here. Summary is just FY + role. */}
              {[
                activeFiscalYear ? `FY ${activeFiscalYear}` : null,
                viewAsRole
                  ? CHAIR_ROLE_CONFIGS[viewAsRole]?.title
                  : (isSuperAdmin ? 'Super Admin' : chairConfig.title),
              ].filter(Boolean).join(' · ')}
            </span>
            {contextExpanded
              ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
          </button>

          {contextExpanded && (
            <div className="pb-3">
              {/* Chapter switcher (super-admin only — auto-hides for
                  single-chapter users). FY switcher sits below it.
                  The chevron is the single control for expand/collapse
                  — no auto-close on selection. */}
              <div className="pt-2">
                <ChapterSwitcher />
              </div>
              <div className="pt-2">
                <FiscalYearSwitcher />
              </div>

              {/* Role switcher — super admin + president */}
              {canSwitchRoles && (
                <div className="px-4 pt-2">
            <label className="flex items-center gap-1.5 text-[10px] font-bold tracking-widest text-muted-foreground uppercase mb-1">
              <Eye className="h-3 w-3" />
              Switch role
            </label>
            <select
              value={viewAsRole || ''}
              onChange={e => {
                setViewAsRole(e.target.value || null)
                // When the user picks the empty option they return to their
                // own role. `getChairConfig` resolves aliases (president_elect,
                // president_elect_elect) to the right surface.
                const ownConfig = isSuperAdmin
                  ? CHAIR_ROLE_CONFIGS.super_admin
                  : getChairConfig(profile?.role)
                const config = e.target.value
                  ? CHAIR_ROLE_CONFIGS[e.target.value]
                  : ownConfig
                if (config?.homePath) navigate(config.homePath)
              }}
              className="w-full text-xs bg-sidebar-accent/40 border border-sidebar-border rounded-lg px-2 py-1.5 text-sidebar-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            >
              <option value="">
                {isSuperAdmin
                  ? 'Super Admin'
                  : (getChairConfig(profile?.role)?.title || 'My Role')}
              </option>
              {SWITCHABLE_CHAIR_ROLES.filter(r => r !== profile?.role).map(r => (
                <option key={r} value={r}>{CHAIR_ROLE_CONFIGS[r].title}</option>
              ))}
            </select>
            {/* SAP contact picker — when viewing as SAP Partner */}
            {viewAsRole === 'sap_contact' && (
              <div className="mt-2">
                <label className="text-[10px] text-muted-foreground/70 mb-0.5 block">as contact</label>
                <select
                  value={viewAsSapContactId || ''}
                  onChange={e => {
                    setViewAsSapContactId(e.target.value || null)
                    navigate('/sap-portal')
                  }}
                  className="w-full text-xs bg-sidebar-accent/40 border border-sidebar-border rounded-lg px-2 py-1.5 text-sidebar-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                >
                  <option value="">— pick a contact —</option>
                  {sapContacts.map(c => {
                    const p = sapPartners.find(sp => sp.id === c.sap_id)
                    return <option key={c.id} value={c.id}>{c.name}{p ? ` (${p.name})` : ''}</option>
                  })}
                </select>
              </div>
            )}
            {/* Region picker — when viewing as a regional chair/expert.
                Source: DISTINCT chapter.region values currently in the
                platform. Picking "U.S. West" here makes the regional
                dashboard show chapters tagged U.S. West. */}
            {viewAsRole === 'regional_learning_chair_expert' && (
              <div className="mt-2">
                <label className="text-[10px] text-muted-foreground/70 mb-0.5 block">as region</label>
                <select
                  value={viewAsRegion || ''}
                  onChange={e => {
                    setViewAsRegion(e.target.value || null)
                    navigate('/regional/learning')
                  }}
                  className="w-full text-xs bg-sidebar-accent/40 border border-sidebar-border rounded-lg px-2 py-1.5 text-sidebar-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                >
                  <option value="">— pick a region —</option>
                  {[...new Set((allChapters || []).map(c => c.region).filter(Boolean))]
                    .sort((a, b) => a.localeCompare(b))
                    .map(region => (
                      <option key={region} value={region}>{region}</option>
                    ))}
                </select>
              </div>
            )}
            {/* No "Back to my role" button — returning to your own role is
                done by selecting the first (own-role) entry in the dropdown
                above. That empty option's onChange clears viewAsRole and
                navigates to the owner's homePath. Keeps the sidebar lean
                and avoids two UI elements doing the same job. */}
                </div>
              )}
            </div>
          )}
        </div>

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
                    ? activeNavClass
                    : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground'
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
                <p className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">Admin</p>
              </div>
              {visibleAdmin.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? activeNavClass
                        : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground'
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
                <p className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">Board</p>
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
                        ? activeNavClass
                        : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                    }`
                  }
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </NavLink>
              ))}
            </>
          )}

          {/* Moderator section — sits ABOVE Member per the sidebar
              ordering rule: role-specific items at top, board surfaces,
              moderator surfaces, then member surfaces last. Moderator
              is a hat (not a separate identity) but more specialized
              than the universal Member section, so it gets the
              specialized slot just above Member. Forum sub-items
              deep-link into existing ForumHomePage tabs with edit
              affordances already gated on isModerator inside that
              page. Moderator Events is the new moderator-only calendar
              (monthly meetings + annual regional summit). */}
          {showModeratorSection && (
            <>
              <div className="pt-4 pb-2 px-3">
                <p className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">Moderator</p>
              </div>
              {moderatorItems.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? activeNavClass
                        : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                    }`
                  }
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </NavLink>
              ))}
            </>
          )}

          {/* Member section — sits LAST per the sidebar ordering rule.
              Every chair (except staff) is also a member, so this
              section is the universal floor under everything else.
              Forum and Vendors are expandable groups: they auto-expand
              whenever the current route is inside the group, and
              auto-collapse when the user navigates away. */}
          {showMemberSection && (
            <>
              <div className="pt-4 pb-2 px-3">
                <p className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">Member</p>
              </div>
              {memberItems.map((item) => {
                const Icon = item.icon
                const inGroup = item.children && (
                  item.alwaysExpanded ||
                  location.pathname === item.to ||
                  item.children.some(c => c.to === location.pathname)
                )
                return (
                  <div key={item.to}>
                    <NavLink
                      to={item.to}
                      onClick={onNavigate}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                          isActive
                            ? activeNavClass
                            : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                        }`
                      }
                    >
                      <Icon className="h-4 w-4" />
                      <span className="flex-1">{item.label}</span>
                      {item.children && (
                        inGroup
                          ? <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                          : <ChevronRight className="h-3.5 w-3.5 opacity-60" />
                      )}
                    </NavLink>
                    {item.children && inGroup && (
                      <div className="mt-1 mb-1 ml-4 pl-3 border-l border-sidebar-border space-y-1">
                        {item.children.map(({ to: childTo, icon: ChildIcon, label: childLabel }) => {
                          // Children with ?tab= deep-link to a specific
                          // tab on the same route (e.g. /portal/forum).
                          // NavLink's default active match only compares
                          // pathname, so every child would highlight at
                          // once on /portal/forum. Compute active state
                          // here so the right one lights up.
                          const childActive = isChildActive(childTo, location)
                          return (
                          <NavLink
                            key={childTo}
                            to={childTo}
                            onClick={onNavigate}
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                              childActive
                                ? activeNavClass
                                : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                            }`}
                          >
                            <ChildIcon className="h-3.5 w-3.5" />
                            {childLabel}
                          </NavLink>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </>
          )}

          {/* Platform Admin is intentionally NOT surfaced in chair-role
              sidebars. Access to /super-admin belongs strictly to the
              Super Admin surface (its own nav config). A super-admin who
              has role-switched into a chair view returns to Platform
              Admin via the "Back to Super Admin" link in the collapsible
              context block above. */}
        </nav>

        {/* Bottom links */}
        <div className="px-4 pb-2 space-y-1">
          <NavLink
            to="/feedback"
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors ${
                isActive
                  ? activeNavClass
                  : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground'
              }`
            }
          >
            <MessageSquarePlus className="h-3.5 w-3.5" />
            Suggestion | Report Bug
          </NavLink>
          <button
            onClick={resetTourTips}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors cursor-pointer w-full"
            title="Reshow all tour tips"
          >
            <Lightbulb className="h-3.5 w-3.5" />
            Show tour tips
          </button>
        </div>

        {/* Footer: User info (click → My Profile) + Sign out */}
        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center justify-between gap-2">
            <Link
              to="/portal/profile"
              onClick={onNavigate}
              title="My profile (photo, SLP, contact info)"
              className="min-w-0 flex-1 -m-1 p-1 rounded-lg hover:bg-sidebar-accent transition-colors"
            >
              <p className="text-xs font-medium text-sidebar-foreground truncate">
                {profile?.full_name || 'User'}
              </p>
              <p className="text-[10px] text-muted-foreground/80 truncate">
                {profile?.email || ''}
              </p>
            </Link>
            <button
              onClick={handleSignOut}
              title="Sign out"
              className="text-muted-foreground/70 hover:text-sidebar-foreground p-1.5 rounded-lg hover:bg-sidebar-accent transition-colors cursor-pointer shrink-0"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3 border-t border-sidebar-border pt-2 text-center">
            {isStaging && (
              <span className="text-[10px] font-semibold text-staging mr-1.5">staging</span>
            )}
            <span className="text-[10px] text-muted-foreground">v{APP_VERSION}</span>
          </div>
        </div>
      </aside>
    </>
  )
}
