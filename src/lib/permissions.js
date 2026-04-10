// Admin roles that get full access (Learning-Chair-flavored permissions)
export const ADMIN_ROLES = ['super_admin', 'learning_chair', 'chapter_experience_coordinator', 'chapter_executive_director']

// Super admin only
export const SUPER_ADMIN_ROLES = ['super_admin']

// Board roles that can access the board module
export const BOARD_ROLES = ['super_admin', 'board_liaison', 'chapter_experience_coordinator', 'chapter_executive_director']

// Roles that can manage board positions, assignments, and chapter settings
export const SETTINGS_ROLES = ['super_admin', 'chapter_executive_director', 'chapter_experience_coordinator']

// Engagement Chair scope
export const ENGAGEMENT_ROLES = ['super_admin', 'engagement_chair']

// Feature-level permissions
export const FEATURE_PERMISSIONS = {
  canEditEvents:         [...ADMIN_ROLES, 'committee_member'],
  canEditSpeakers:       [...ADMIN_ROLES, 'committee_member'],
  canViewBudget:         ADMIN_ROLES,
  canEditBudget:         ADMIN_ROLES,
  canViewVenues:         ADMIN_ROLES,
  canViewScenarios:      ADMIN_ROLES,
  canEditChapterConfig:  ['super_admin', 'chapter_executive_director'],
  canManageSettings:     ['super_admin', 'chapter_executive_director', 'chapter_experience_coordinator'],
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
}

export function hasPermission(role, feature) {
  return FEATURE_PERMISSIONS[feature]?.includes(role) ?? false
}

// All roles that can access the admin layout (sidebar)
export const ADMIN_LAYOUT_ROLES = ['super_admin', ...ADMIN_ROLES, 'engagement_chair', 'committee_member', 'board_liaison']

// All roles that can access the member portal
export const PORTAL_ROLES = ['member', ...ADMIN_LAYOUT_ROLES]
