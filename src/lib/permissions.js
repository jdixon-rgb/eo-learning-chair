// Admin roles that get full access
export const ADMIN_ROLES = ['super_admin', 'learning_chair', 'chapter_experience_coordinator', 'chapter_executive_director']

// Super admin only
export const SUPER_ADMIN_ROLES = ['super_admin']

// Feature-level permissions
export const FEATURE_PERMISSIONS = {
  canEditEvents:         [...ADMIN_ROLES, 'committee_member'],
  canEditSpeakers:       [...ADMIN_ROLES, 'committee_member'],
  canViewBudget:         ADMIN_ROLES,
  canEditBudget:         ADMIN_ROLES,
  canViewVenues:         ADMIN_ROLES,
  canViewScenarios:      ADMIN_ROLES,
  canManageSettings:     ADMIN_ROLES,
  canManageMembers:      ADMIN_ROLES,
  canSendNotifications:  ADMIN_ROLES,
  canViewSurveyResults:  ADMIN_ROLES,
}

export function hasPermission(role, feature) {
  return FEATURE_PERMISSIONS[feature]?.includes(role) ?? false
}

// All roles that can access the admin layout (sidebar)
export const ADMIN_LAYOUT_ROLES = ['super_admin', ...ADMIN_ROLES, 'committee_member', 'board_liaison']

// All roles that can access the member portal
export const PORTAL_ROLES = ['member', ...ADMIN_LAYOUT_ROLES]
