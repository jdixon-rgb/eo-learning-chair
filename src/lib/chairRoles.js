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
} from 'lucide-react'

// Shared nav items reused across similar role configs
const LEARNING_CHAIR_NAV = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/calendar', icon: Calendar, label: 'Year Arc' },
  { to: '/speakers', icon: Users, label: 'Speakers' },
  { to: '/events', icon: CalendarDays, label: 'Events' },
  { to: '/partners', icon: Handshake, label: 'Partners', permission: 'canViewPartners' },
  { to: '/venues', icon: MapPin, label: 'Venues', permission: 'canViewVenues' },
  { to: '/budget', icon: DollarSign, label: 'Budget', permission: 'canViewBudget' },
  { to: '/scenarios', icon: Shuffle, label: 'Scenarios', permission: 'canViewScenarios' },
]

export const CHAIR_ROLE_CONFIGS = {
  super_admin: {
    title: 'Super Admin',
    homePath: '/super-admin',
    navItems: [
      { to: '/super-admin', icon: LayoutDashboard, label: 'Platform Dashboard' },
      { to: '/partners', icon: Handshake, label: 'Partners', permission: 'canViewPartners' },
      { to: '/settings', icon: Settings, label: 'Settings', permission: 'canManageSettings' },
    ],
  },
  president: {
    title: 'President',
    homePath: '/president',
    navItems: [
      { to: '/president', icon: Crown, label: 'Dashboard' },
      { to: '/partners', icon: Handshake, label: 'Partners', permission: 'canViewPartners' },
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
  sap_contact: {
    title: 'SAP Partner',
    homePath: '/sap-portal',
    navItems: [], // SAP portal uses its own layout/nav, not the admin sidebar
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
