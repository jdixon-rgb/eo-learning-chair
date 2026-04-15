// Admin roles that get full access (Learning-Chair-flavored permissions)
export const ADMIN_ROLES = ['super_admin', 'president', 'learning_chair', 'chapter_experience_coordinator', 'chapter_executive_director']

// Super admin only
export const SUPER_ADMIN_ROLES = ['super_admin']

// President-level roles (can view all chairs, manage settings, set budget)
export const PRESIDENT_ROLES = ['super_admin', 'president', 'president_elect', 'president_elect_elect']

// Board roles that can access the board module
export const BOARD_ROLES = ['super_admin', 'president', 'finance_chair', 'board_liaison', 'chapter_experience_coordinator', 'chapter_executive_director']

// Roles that can manage board positions, assignments, and chapter settings
export const SETTINGS_ROLES = ['super_admin', 'president', 'chapter_executive_director', 'chapter_experience_coordinator']

// Engagement Chair scope — chapter staff also have access
export const ENGAGEMENT_ROLES = ['super_admin', 'engagement_chair', 'chapter_executive_director', 'chapter_experience_coordinator']

// Finance Chair scope — chapter staff also have access
export const FINANCE_ROLES = ['super_admin', 'president', 'finance_chair', 'chapter_executive_director', 'chapter_experience_coordinator']

// Feature-level permissions
export const FEATURE_PERMISSIONS = {
  canEditEvents:         [...ADMIN_ROLES, 'committee_member'],
  canEditSpeakers:       [...ADMIN_ROLES, 'committee_member'],
  canViewBudget:         [...ADMIN_ROLES, 'finance_chair'],
  canEditBudget:         ADMIN_ROLES,
  canViewVenues:         ADMIN_ROLES,
  canViewScenarios:      ADMIN_ROLES,
  canEditChapterConfig:  ['super_admin', 'president', 'chapter_executive_director'],
  canManageSettings:     SETTINGS_ROLES,
  canManageMembers:      ADMIN_ROLES,
  canSendNotifications:  ADMIN_ROLES,
  canViewSurveyResults:  ADMIN_ROLES,
  // Board module
  canViewBoard:          [...BOARD_ROLES, 'learning_chair'],
  canManageChairReports: BOARD_ROLES,
  canManageComms:        BOARD_ROLES,
  canManageForums:       BOARD_ROLES,
  canViewScorecards:     BOARD_ROLES,
  canViewCoordinator:    ADMIN_ROLES,
  // Engagement Chair module
  canManageEngagement:   ENGAGEMENT_ROLES,
  // President / Finance
  canManageFYBudget:     ['super_admin', 'president', 'finance_chair', 'chapter_executive_director', 'chapter_experience_coordinator'],
  // Partners (SAP) — visible to leadership, learning chairs, and staff
  canViewPartners:       ['super_admin', 'president', 'president_elect', 'president_elect_elect', 'learning_chair', 'learning_chair_elect', 'chapter_executive_director', 'chapter_experience_coordinator'],
}

export function hasPermission(role, feature) {
  return FEATURE_PERMISSIONS[feature]?.includes(role) ?? false
}

// All roles that can access the admin layout (sidebar)
export const ADMIN_LAYOUT_ROLES = ['super_admin', 'president', 'president_elect', 'president_elect_elect', 'finance_chair', 'learning_chair_elect', ...ADMIN_ROLES, 'engagement_chair', 'committee_member', 'board_liaison']

// All roles that can access the member portal
export const PORTAL_ROLES = ['member', ...ADMIN_LAYOUT_ROLES]

// SAP Partner Portal — external partner contacts only
export const SAP_PORTAL_ROLES = ['sap_contact']
