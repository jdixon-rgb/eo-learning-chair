// Per-chair-role command center configs.
// Each chair role gets its own sidebar title, landing page, and nav items.
// The sidebar reads from this registry based on the user's *effective* role
// (which equals their actual role unless a super admin or president is switching).
//
// Elect roles (president_elect, president_elect_elect, learning_chair_elect)
// are board positions assigned in Settings — they share the same app surface
// as their parent role. The fiscal year selector determines context.
//
// Adding a new chair role surface = add an entry here + add the routes in
// App.jsx + create the pages under src/pages/<role>/. No sidebar refactor.

import {
  LayoutDashboard,
  Calendar,
  Users,
  Users2,
  UserPlus,
  CalendarDays,
  MapPin,
  Wallet,
  Shuffle,
  Settings,
  UserCheck,
  BookOpen,
  Compass,
  Heart,
  Activity,
  Handshake,
  Crown,
  Briefcase,
  BarChart3,
  ClipboardList,
  Lightbulb,
  Globe2,
  GitBranch,
  Megaphone,
  AlertTriangle,
  Utensils,
} from 'lucide-react'

// Shared nav items reused across similar role configs
const LEARNING_CHAIR_NAV = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/calendar', icon: Calendar, label: 'Year Arc' },
  { to: '/chapter-calendar', icon: CalendarDays, label: 'Chapter Calendar' },
  { to: '/speakers', icon: Users, label: 'Speakers' },
  { to: '/library/speakers', icon: BookOpen, label: 'Speaker Library', permission: 'canViewSpeakerLibrary' },
  { to: '/events', icon: CalendarDays, label: 'Events' },
  { to: '/partners', icon: Handshake, label: 'SAPs', permission: 'canViewPartners' },
  { to: '/venues', icon: MapPin, label: 'Venues', permission: 'canViewVenues' },
  { to: '/budget', icon: Wallet, label: 'Budget', permission: 'canViewBudget' },
  { to: '/scenarios', icon: Shuffle, label: 'Scenarios', permission: 'canViewScenarios' },
  { to: '/admin/surveys', icon: ClipboardList, label: 'Survey Results', permission: 'canViewSurveyResults' },
  { to: '/recommendations', icon: Lightbulb, label: 'Recommendations' },
  { to: '/forum-health/at-risk', icon: AlertTriangle, label: 'Flag At-Risk Member', permission: 'canFlagAtRisk' },
]

export const CHAIR_ROLE_CONFIGS = {
  super_admin: {
    title: 'Super Admin',
    homePath: '/super-admin',
    // Platform-level only. Chapter-scoped concerns (SAPs, Settings,
    // Admin, Board) belong to chair surfaces — super-admin accesses
    // them by role-switching.
    navItems: [
      { to: '/super-admin', icon: LayoutDashboard, label: 'Platform Dashboard' },
      { to: '/super-admin/regional-experts', icon: Globe2, label: 'Regional Experts' },
      { to: '/super-admin/analytics', icon: BarChart3, label: 'Analytics' },
    ],
  },
  regional_learning_chair_expert: {
    title: 'Regional Learning Chair Expert',
    homePath: '/regional/learning',
    // Spans multiple chapters within a region. The Regional Dashboard is
    // her home. From there she drills into any chapter's Year Arc /
    // Speakers / Events etc. in read-only mode. All nav items below
    // resolve against whichever chapter she's selected as active — she
    // switches chapters via the sidebar Chapter Switcher (limited to
    // chapters in her region by ChapterProvider).
    navItems: [
      { to: '/regional/learning', icon: Globe2, label: 'Regional Dashboard' },
      { to: '/calendar', icon: Calendar, label: 'Year Arc' },
      { to: '/speakers', icon: Users, label: 'Speakers' },
      { to: '/library/speakers', icon: BookOpen, label: 'Speaker Library', permission: 'canViewSpeakerLibrary' },
      { to: '/events', icon: CalendarDays, label: 'Events' },
      { to: '/partners', icon: Handshake, label: 'SAPs', permission: 'canViewPartners' },
      { to: '/venues', icon: MapPin, label: 'Venues', permission: 'canViewVenues' },
      { to: '/budget', icon: Wallet, label: 'Budget', permission: 'canViewBudget' },
      { to: '/admin/surveys', icon: ClipboardList, label: 'Survey Results', permission: 'canViewSurveyResults' },
    ],
  },
  regional_manager: {
    title: 'Regional Manager',
    // EO Global staff who supports chapters in their region — read-only
    // across chapters. Same region-scoped chapter switcher as the
    // Regional Learning Chair Expert; broader nav (chapter ops, not just
    // learning-chair surfaces). No dedicated regional dashboard yet, so
    // home is the chapter-level Chapter Calendar — they pick a chapter
    // in the switcher and drill in from there.
    homePath: '/chapter-calendar',
    navItems: [
      { to: '/chapter-calendar', icon: CalendarDays, label: 'Chapter Calendar' },
      { to: '/calendar', icon: Calendar, label: 'Year Arc' },
      { to: '/events', icon: CalendarDays, label: 'Events' },
      { to: '/speakers', icon: Users, label: 'Speakers' },
      { to: '/library/speakers', icon: BookOpen, label: 'Speaker Library', permission: 'canViewSpeakerLibrary' },
      { to: '/partners', icon: Handshake, label: 'SAPs', permission: 'canViewPartners' },
      { to: '/venues', icon: MapPin, label: 'Venues', permission: 'canViewVenues' },
      { to: '/budget', icon: Wallet, label: 'Budget', permission: 'canViewBudget' },
      { to: '/admin/surveys', icon: ClipboardList, label: 'Survey Results', permission: 'canViewSurveyResults' },
    ],
  },
  sap_chair: {
    title: 'SAP Chair',
    homePath: '/partners',
    navItems: [
      // /partners hosts a segmented toggle: Active | Prospect | Past
      { to: '/partners', icon: Handshake, label: 'Manage SAPs' },
      { to: '/calendar', icon: Calendar, label: 'Year Arc' },
      { to: '/chapter-calendar', icon: CalendarDays, label: 'Chapter Calendar' },
      { to: '/forum-health/at-risk', icon: AlertTriangle, label: 'Flag At-Risk Member', permission: 'canFlagAtRisk' },
    ],
  },
  slp_chair: {
    title: 'SLP Chair',
    // Lands on SLP Management — that's the chair's primary surface
    // (manage SLP roster + forum assignments + invites). /board/forums
    // shows the SLP-population forums alongside member forums; for now
    // the population badge in the card is the differentiator. A
    // dedicated SLP Forums page lands in Wave 2B.
    homePath: '/admin/slps',
    navItems: [
      { to: '/admin/slps', icon: Heart, label: 'SLPs' },
      { to: '/board/forums', icon: Users2, label: 'Forums' },
      { to: '/chapter-calendar', icon: CalendarDays, label: 'Chapter Calendar' },
    ],
  },
  president: {
    title: 'President',
    homePath: '/president',
    // President sees the full ledger via canViewAtRisk (broader view set
    // includes president track). Label stays "At-Risk Members" since
    // they see the list, not just a submission form.
    navItems: [
      { to: '/president', icon: Crown, label: 'Dashboard' },
      { to: '/chapter-calendar', icon: CalendarDays, label: 'Chapter Calendar' },
      { to: '/partners', icon: Handshake, label: 'SAPs', permission: 'canViewPartners' },
      { to: '/admin/surveys', icon: ClipboardList, label: 'Survey Results', permission: 'canViewSurveyResults' },
      { to: '/forum-health/at-risk', icon: AlertTriangle, label: 'At-Risk Members', permission: 'canViewAtRisk' },
      { to: '/president/budget', icon: Wallet, label: 'Chapter Budget', permission: 'canManageFYBudget' },
      { to: '/settings', icon: Settings, label: 'Settings', permission: 'canManageSettings' },
    ],
  },
  finance_chair: {
    title: 'Finance Chair',
    homePath: '/finance',
    navItems: [
      { to: '/finance', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/chapter-calendar', icon: CalendarDays, label: 'Chapter Calendar' },
      { to: '/president/budget', icon: Wallet, label: 'Chapter Budget', permission: 'canManageFYBudget' },
      { to: '/forum-health/at-risk', icon: AlertTriangle, label: 'Flag At-Risk Member', permission: 'canFlagAtRisk' },
    ],
  },
  learning_chair: {
    title: 'Learning Chair',
    homePath: '/',
    navItems: LEARNING_CHAIR_NAV,
  },
  engagement_chair: {
    title: 'Member Engagement Chair',
    homePath: '/engagement',
    navItems: [
      { to: '/engagement', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/chapter-calendar', icon: CalendarDays, label: 'Chapter Calendar' },
      { to: '/engagement/navigators', icon: Compass, label: 'Navigators' },
      { to: '/engagement/pairings', icon: UserCheck, label: 'Pairings' },
      { to: '/engagement/breaking-barriers', icon: Utensils, label: 'Breaking Barriers' },
      { to: '/engagement/mentors', icon: Heart, label: 'Mentors' },
      { to: '/engagement/library', icon: BookOpen, label: 'Conversation Library' },
      { to: '/forum-health/at-risk', icon: AlertTriangle, label: 'Flag At-Risk Member', permission: 'canFlagAtRisk' },
    ],
  },
  forum_health_chair: {
    title: 'Forum Health Chair',
    homePath: '/forum-health',
    // Owns forum-wide health: triages forums needing attention, runs the
    // moderator summit, broadcasts to all moderators. Reuses the existing
    // /board/forums admin page as the per-forum management surface.
    navItems: [
      { to: '/forum-health', icon: Activity, label: 'Dashboard' },
      { to: '/chapter-calendar', icon: CalendarDays, label: 'Chapter Calendar' },
      { to: '/board/forums', icon: Users2, label: 'Forums', permission: 'canManageForums' },
      { to: '/forum-health/at-risk', icon: AlertTriangle, label: 'At-Risk Members' },
      { to: '/forum-health/comms', icon: Megaphone, label: 'Moderator Comms' },
    ],
  },
  forum_placement_chair: {
    title: 'Forum Placement Chair',
    homePath: '/forum-placement',
    // Owns the new-member pipeline: triages member referrals from the
    // membership, places members into forums.
    navItems: [
      { to: '/forum-placement', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/chapter-calendar', icon: CalendarDays, label: 'Chapter Calendar' },
      { to: '/forum-placement/leads', icon: UserPlus, label: 'Member Leads' },
      { to: '/forum-health/at-risk', icon: AlertTriangle, label: 'At-Risk Members' },
      { to: '/board/forums', icon: Users2, label: 'Forums', permission: 'canManageForums' },
    ],
  },
  chapter_executive_director: {
    title: 'Chapter Executive Director',
    homePath: '/president',
    navItems: [
      { to: '/president', icon: Briefcase, label: 'Chapter Dashboard' },
      { to: '/chapter-calendar', icon: CalendarDays, label: 'Chapter Calendar' },
      { to: '/calendar', icon: Calendar, label: 'Year Arc' },
      { to: '/speakers', icon: Users, label: 'Speakers' },
      { to: '/events', icon: CalendarDays, label: 'Events' },
      { to: '/partners', icon: Handshake, label: 'SAPs', permission: 'canViewPartners' },
      { to: '/venues', icon: MapPin, label: 'Venues', permission: 'canViewVenues' },
      { to: '/scenarios', icon: Shuffle, label: 'Scenarios', permission: 'canViewScenarios' },
      { to: '/forum-health/at-risk', icon: AlertTriangle, label: 'At-Risk Members', permission: 'canViewAtRisk' },
      { to: '/president/budget', icon: Wallet, label: 'Chapter Budget', permission: 'canManageFYBudget' },
      { to: '/settings', icon: Settings, label: 'Settings', permission: 'canManageSettings' },
    ],
  },
  chapter_experience_coordinator: {
    title: 'Chapter Experience Coordinator',
    homePath: '/president',
    navItems: [
      { to: '/president', icon: Briefcase, label: 'Chapter Dashboard' },
      { to: '/chapter-calendar', icon: CalendarDays, label: 'Chapter Calendar' },
      { to: '/calendar', icon: Calendar, label: 'Year Arc' },
      { to: '/speakers', icon: Users, label: 'Speakers' },
      { to: '/events', icon: CalendarDays, label: 'Events' },
      { to: '/partners', icon: Handshake, label: 'SAPs', permission: 'canViewPartners' },
      { to: '/venues', icon: MapPin, label: 'Venues', permission: 'canViewVenues' },
      { to: '/scenarios', icon: Shuffle, label: 'Scenarios', permission: 'canViewScenarios' },
      { to: '/forum-health/at-risk', icon: AlertTriangle, label: 'At-Risk Members', permission: 'canViewAtRisk' },
      { to: '/president/budget', icon: Wallet, label: 'Chapter Budget', permission: 'canManageFYBudget' },
      { to: '/settings', icon: Settings, label: 'Settings', permission: 'canManageSettings' },
    ],
  },
  sap_contact: {
    title: 'SAP Partner',
    homePath: '/sap-portal',
    navItems: [], // SAP portal uses its own layout/nav, not the admin sidebar
  },
  member: {
    title: 'Member',
    homePath: '/portal',
    navItems: [], // Member portal uses its own layout/nav, not the admin sidebar
  },
  // Moderator is an *elevation* on top of the Member surface, not a
  // standalone chair role. It only appears here so that super-admins
  // and presidents can preview the moderator experience via "Switch
  // role." When viewAsRole === 'moderator', useIsModerator() returns
  // true and the Member sidebar gains the Moderator section. The
  // homePath drops the previewer onto Moderator Events directly so
  // they see the new surface without hunting for it.
  moderator: {
    // Title is just "Moderator" (not "Forum Moderator") to avoid the
    // role-switcher reading like a fourth Forum tier alongside Forum
    // Health Chair and Forum Placement Chair. In context the role
    // belongs to a forum, but the surfacing in the sidebar should
    // stand on its own.
    title: 'Moderator',
    homePath: '/portal/moderator/events',
    navItems: [], // Member sidebar + injected Moderator section drive the nav
  },
}

// Elect roles map to their parent surface — if someone logs in as president_elect,
// they see the president surface. The FY selector determines which year they're in.
const ROLE_ALIASES = {
  president_elect: 'president',
  president_elect_elect: 'president',
  learning_chair_elect: 'learning_chair',
}

// Default fallback for roles without their own chair surface
// (board_liaison, committee_member, etc.)
export const DEFAULT_CHAIR_CONFIG = CHAIR_ROLE_CONFIGS.learning_chair

export function getChairConfig(role) {
  const resolved = ROLE_ALIASES[role] || role
  return CHAIR_ROLE_CONFIGS[resolved] ?? DEFAULT_CHAIR_CONFIG
}

// Chair roles available in the "view as" switcher (only actual surfaces, not aliases)
// Sorted alphabetically by title for easy scanning
export const SWITCHABLE_CHAIR_ROLES = Object.keys(CHAIR_ROLE_CONFIGS)
  .filter(r => r !== 'super_admin')
  .sort((a, b) => CHAIR_ROLE_CONFIGS[a].title.localeCompare(CHAIR_ROLE_CONFIGS[b].title))
