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
  CalendarDays,
  MapPin,
  DollarSign,
  Shuffle,
  Settings,
  UserCheck,
  BookOpen,
  Compass,
  Heart,
  Handshake,
  Crown,
  Briefcase,
  BarChart3,
  ClipboardList,
  Lightbulb,
  Globe2,
} from 'lucide-react'

// Shared nav items reused across similar role configs
const LEARNING_CHAIR_NAV = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/calendar', icon: Calendar, label: 'Year Arc' },
  { to: '/speakers', icon: Users, label: 'Speakers' },
  { to: '/events', icon: CalendarDays, label: 'Events' },
  { to: '/partners', icon: Handshake, label: 'SAPs', permission: 'canViewPartners' },
  { to: '/venues', icon: MapPin, label: 'Venues', permission: 'canViewVenues' },
  { to: '/budget', icon: DollarSign, label: 'Budget', permission: 'canViewBudget' },
  { to: '/scenarios', icon: Shuffle, label: 'Scenarios', permission: 'canViewScenarios' },
  { to: '/admin/surveys', icon: ClipboardList, label: 'Survey Results', permission: 'canViewSurveyResults' },
  { to: '/recommendations', icon: Lightbulb, label: 'Recommendations' },
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
      { to: '/events', icon: CalendarDays, label: 'Events' },
      { to: '/partners', icon: Handshake, label: 'SAPs', permission: 'canViewPartners' },
      { to: '/venues', icon: MapPin, label: 'Venues', permission: 'canViewVenues' },
      { to: '/budget', icon: DollarSign, label: 'Budget', permission: 'canViewBudget' },
      { to: '/admin/surveys', icon: ClipboardList, label: 'Survey Results', permission: 'canViewSurveyResults' },
    ],
  },
  sap_chair: {
    title: 'SAP Chair',
    homePath: '/partners',
    navItems: [
      { to: '/partners', icon: Handshake, label: 'SAPs' },
      { to: '/events', icon: CalendarDays, label: 'Events' },
      { to: '/calendar', icon: Calendar, label: 'Year Arc' },
    ],
  },
  president: {
    title: 'President',
    homePath: '/president',
    navItems: [
      { to: '/president', icon: Crown, label: 'Dashboard' },
      { to: '/partners', icon: Handshake, label: 'SAPs', permission: 'canViewPartners' },
      { to: '/admin/surveys', icon: ClipboardList, label: 'Survey Results', permission: 'canViewSurveyResults' },
      { to: '/president/budget', icon: DollarSign, label: 'Chapter Budget', permission: 'canManageFYBudget' },
      { to: '/settings', icon: Settings, label: 'Settings', permission: 'canManageSettings' },
    ],
  },
  finance_chair: {
    title: 'Finance Chair',
    homePath: '/finance',
    navItems: [
      { to: '/finance', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/president/budget', icon: DollarSign, label: 'Chapter Budget', permission: 'canManageFYBudget' },
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
      { to: '/engagement/navigators', icon: Compass, label: 'Navigators' },
      { to: '/engagement/mentors', icon: Heart, label: 'Mentors' },
      { to: '/engagement/pairings', icon: UserCheck, label: 'Pairings' },
      { to: '/engagement/library', icon: BookOpen, label: 'Conversation Library' },
    ],
  },
  chapter_executive_director: {
    title: 'Chapter Executive Director',
    homePath: '/president',
    navItems: [
      { to: '/president', icon: Briefcase, label: 'Chapter Dashboard' },
      { to: '/calendar', icon: Calendar, label: 'Year Arc' },
      { to: '/speakers', icon: Users, label: 'Speakers' },
      { to: '/events', icon: CalendarDays, label: 'Events' },
      { to: '/partners', icon: Handshake, label: 'SAPs', permission: 'canViewPartners' },
      { to: '/venues', icon: MapPin, label: 'Venues', permission: 'canViewVenues' },
      { to: '/scenarios', icon: Shuffle, label: 'Scenarios', permission: 'canViewScenarios' },
      { to: '/president/budget', icon: DollarSign, label: 'Chapter Budget', permission: 'canManageFYBudget' },
      { to: '/settings', icon: Settings, label: 'Settings', permission: 'canManageSettings' },
    ],
  },
  chapter_experience_coordinator: {
    title: 'Chapter Experience Coordinator',
    homePath: '/president',
    navItems: [
      { to: '/president', icon: Briefcase, label: 'Chapter Dashboard' },
      { to: '/calendar', icon: Calendar, label: 'Year Arc' },
      { to: '/speakers', icon: Users, label: 'Speakers' },
      { to: '/events', icon: CalendarDays, label: 'Events' },
      { to: '/partners', icon: Handshake, label: 'SAPs', permission: 'canViewPartners' },
      { to: '/venues', icon: MapPin, label: 'Venues', permission: 'canViewVenues' },
      { to: '/scenarios', icon: Shuffle, label: 'Scenarios', permission: 'canViewScenarios' },
      { to: '/president/budget', icon: DollarSign, label: 'Chapter Budget', permission: 'canManageFYBudget' },
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
