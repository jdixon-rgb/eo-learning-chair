// Admin roles that get full access (Learning-Chair-flavored permissions).
// president_elect shadows the president and gets the same admin route
// access (read-only on most surfaces — edit gates are handled per-page).
export const ADMIN_ROLES = ['super_admin', 'president', 'president_elect', 'learning_chair', 'sap_chair', 'chapter_experience_coordinator', 'chapter_executive_director']

// Super admin only
export const SUPER_ADMIN_ROLES = ['super_admin']

// President-level roles (can view all chairs, manage settings, set budget)
export const PRESIDENT_ROLES = ['super_admin', 'president', 'president_elect', 'president_elect_elect']

// Board roles that can access the board module
export const BOARD_ROLES = ['super_admin', 'president', 'finance_chair', 'board_liaison', 'forum_health_chair', 'forum_placement_chair', 'chapter_experience_coordinator', 'chapter_executive_director']

// Roles that see the full fiscal year on the Member calendar. Everyone
// else (member, moderator, sap_contact, slp, demo_user) sees only the
// first half (Aug–Dec) — second-half programming is still in flux and
// shouldn't be surfaced to members until the board has finalized it.
// Moderator is intentionally NOT included: it's a Member-section
// elevation, not a board seat.
export const CALENDAR_FULL_YEAR_ROLES = [
  'super_admin',
  'regional_learning_chair_expert',
  'regional_manager',
  'president', 'president_elect', 'president_elect_elect',
  'finance_chair',
  'learning_chair', 'learning_chair_elect',
  'engagement_chair',
  'sap_chair',
  'slp_chair',
  'forum_health_chair',
  'forum_placement_chair',
  'chapter_executive_director',
  'chapter_experience_coordinator',
  'board_liaison',
  'committee_member',
]

// Roles that can manage board positions, assignments, and chapter settings
export const SETTINGS_ROLES = ['super_admin', 'president', 'chapter_executive_director', 'chapter_experience_coordinator']

// Roles that can invite people into the chapter via /admin/members.
// Intentionally broad: every chair (board + chair seats including SLP)
// recruits their own people, so they should all be able to bring them in
// without having to go through the ED. Excludes committee_member (broad
// team-member helper role, not a chair) and any regional_* role (those
// are cross-chapter, with no single chapter to invite into).
export const MEMBER_INVITER_ROLES = [
  'super_admin',
  'chapter_executive_director', 'chapter_experience_coordinator',
  'president', 'president_elect', 'president_elect_elect',
  'finance_chair',
  'learning_chair', 'learning_chair_elect',
  'sap_chair',
  'slp_chair',
  'engagement_chair',
  'forum_health_chair', 'forum_placement_chair',
  'board_liaison',
]

// Engagement Chair scope — chapter staff also have access
export const ENGAGEMENT_ROLES = ['super_admin', 'engagement_chair', 'chapter_executive_director', 'chapter_experience_coordinator']

// Finance Chair scope — chapter staff also have access
export const FINANCE_ROLES = ['super_admin', 'president', 'finance_chair', 'chapter_executive_director', 'chapter_experience_coordinator']

// Feature-level permissions.
// regional_learning_chair_expert is added to *view* permissions on Learning-
// Chair surfaces (events, speakers, venues, budget, scenarios, survey
// results, partners) but NEVER to any canEdit* list — she's strictly
// read-only. Private fee amounts are gated by canViewSpeakerFees below.
export const FEATURE_PERMISSIONS = {
  canEditEvents:         [...ADMIN_ROLES, 'committee_member'],
  canEditSpeakers:       [...ADMIN_ROLES, 'committee_member'],
  canViewBudget:         [...ADMIN_ROLES, 'finance_chair', 'regional_learning_chair_expert', 'regional_manager'],
  canEditBudget:         ADMIN_ROLES,
  canViewVenues:         [...ADMIN_ROLES, 'regional_learning_chair_expert', 'regional_manager'],
  canViewScenarios:      [...ADMIN_ROLES, 'regional_learning_chair_expert', 'regional_manager'],
  canEditChapterConfig:  ['super_admin', 'president', 'chapter_executive_director'],
  canManageSettings:     SETTINGS_ROLES,
  canManageMembers:      MEMBER_INVITER_ROLES,
  canSendNotifications:  ADMIN_ROLES,
  // Survey Results are aggregate (no member-identifying data), so Regional
  // Learning Chair Expert can see how events landed across her region.
  canViewSurveyResults:  ['president', 'president_elect', 'president_elect_elect', 'learning_chair', 'learning_chair_elect', 'regional_learning_chair_expert', 'regional_manager'],
  // Speaker fee amounts (fee_estimated, fee_actual). Regional expert sees
  // ranges but not specific amounts — those are often privately negotiated.
  canViewSpeakerFees:    [...ADMIN_ROLES, 'finance_chair', 'committee_member'],
  // Board module
  canViewBoard:          [...BOARD_ROLES, 'learning_chair'],
  canManageChairReports: BOARD_ROLES,
  canManageComms:        BOARD_ROLES,
  canManageForums:       BOARD_ROLES,
  canViewScorecards:     BOARD_ROLES,
  // At-risk ledger. View/edit/resolve is narrow (Forum Health + Forum
  // Placement chairs + chapter admins). Flag-only is broad: any chapter-
  // board role can add an entry but won't see the existing list. Mirrors
  // RLS in migration 096 (can_flag_at_risk). SLP Chair excluded by
  // design — their scope is SLP-only, not member at-risk.
  canViewAtRisk:         ['super_admin', 'president', 'president_elect', 'president_elect_elect', 'chapter_executive_director', 'chapter_experience_coordinator', 'forum_health_chair', 'forum_placement_chair'],
  canFlagAtRisk:         ['super_admin', 'president', 'president_elect', 'president_elect_elect', 'finance_chair', 'learning_chair', 'learning_chair_elect', 'engagement_chair', 'sap_chair', 'forum_health_chair', 'forum_placement_chair', 'chapter_executive_director', 'chapter_experience_coordinator', 'board_liaison', 'committee_member'],
  canViewCoordinator:    ADMIN_ROLES.filter(r => !['sap_chair', 'president'].includes(r)),
  // Engagement Chair module
  canManageEngagement:   ENGAGEMENT_ROLES,
  // President / Finance
  canManageFYBudget:     ['super_admin', 'president', 'finance_chair', 'chapter_executive_director', 'chapter_experience_coordinator'],
  // Partners (SAP) — visible to leadership, learning chairs, staff, and regional roles
  canViewPartners:       ['super_admin', 'president', 'president_elect', 'president_elect_elect', 'learning_chair', 'learning_chair_elect', 'chapter_executive_director', 'chapter_experience_coordinator', 'regional_learning_chair_expert', 'regional_manager'],
  // Editing SAPs — partners, contacts, renewal intent, prospect
  // pipeline, archive/revive — is the SAP Chair's domain. Super-admin
  // retained for cross-chapter support. Other roles view but don't
  // edit, so the chair owns the data for their fiscal year.
  canEditSAPs:           ['super_admin', 'sap_chair'],
  // SAP sponsorship amounts (current + renewal) are sensitive — the
  // SAP Chair (who manages them), the President / President-Elect
  // (who set chapter strategy on partner relationships), and the
  // Executive Director (who handles chapter operations & finance)
  // can see the numbers. Other chairs cannot, even though they can
  // see the partner roster itself.
  canViewSAPAmounts:     ['super_admin', 'sap_chair', 'president', 'president_elect', 'chapter_executive_director'],
  // Public Speaker Library — shared cross-chapter catalog
  canViewSpeakerLibrary:   ['super_admin', 'regional_learning_chair_expert', 'regional_manager', 'president', 'president_elect', 'president_elect_elect', 'learning_chair', 'learning_chair_elect', 'chapter_executive_director', 'chapter_experience_coordinator'],
  // Editing + reviewing mirror the SQL helper can_edit_speaker_library()
  canEditSpeakerLibrary:   ['super_admin', 'regional_learning_chair_expert', 'president', 'president_elect', 'president_elect_elect', 'learning_chair', 'learning_chair_elect', 'chapter_executive_director', 'chapter_experience_coordinator'],
  canReviewSpeakers:       ['super_admin', 'regional_learning_chair_expert', 'president', 'president_elect', 'president_elect_elect', 'learning_chair', 'learning_chair_elect', 'chapter_executive_director', 'chapter_experience_coordinator'],
  // Import requires a chapter pipeline to import into; regional expert has no chapter
  canImportFromLibrary:    ['super_admin', 'learning_chair', 'learning_chair_elect', 'chapter_executive_director', 'chapter_experience_coordinator'],
}

export function hasPermission(role, feature) {
  return FEATURE_PERMISSIONS[feature]?.includes(role) ?? false
}

// Regional oversight roles (span multiple chapters, no chapter_id).
// Regional Manager is EO Global staff supporting chapters in their
// region — read-only across chapters, no chapter-private access.
export const REGIONAL_ROLES = ['regional_learning_chair_expert', 'regional_manager']

// Speaker Library access — anyone who consumes or contributes to the
// public catalog. Mirrors canViewSpeakerLibrary above.
export const SPEAKER_LIBRARY_ROLES = ['super_admin', 'regional_learning_chair_expert', 'regional_manager', 'president', 'president_elect', 'president_elect_elect', 'learning_chair', 'learning_chair_elect', 'chapter_executive_director', 'chapter_experience_coordinator']

// All roles that can access the admin layout (sidebar). Regional roles
// spread via REGIONAL_ROLES so any future regional addition flows in.
export const ADMIN_LAYOUT_ROLES = ['super_admin', ...REGIONAL_ROLES, 'president', 'president_elect', 'president_elect_elect', 'finance_chair', 'learning_chair_elect', 'sap_chair', 'slp_chair', ...ADMIN_ROLES, 'engagement_chair', 'committee_member', 'board_liaison', 'forum_health_chair', 'forum_placement_chair']

// All roles that can access the member portal.
// Regional oversight roles are explicitly excluded — forum / reflections /
// lifeline are member-private and a regional expert shouldn't be able to
// view them even for chapters in her own region.
export const PORTAL_ROLES = ['member', ...ADMIN_LAYOUT_ROLES.filter(r => !REGIONAL_ROLES.includes(r))]

// SAP Partner Portal — external partner contacts only
export const SAP_PORTAL_ROLES = ['sap_contact']
