// Fiscal year months (August = 0 through May = 9)
// EO FY ends June 30. Last learning event is May (Gratitude Gala).
export const FISCAL_MONTHS = [
  { index: 0, name: 'August', shortName: 'Aug', calendarMonth: 8 },
  { index: 1, name: 'September', shortName: 'Sep', calendarMonth: 9 },
  { index: 2, name: 'October', shortName: 'Oct', calendarMonth: 10 },
  { index: 3, name: 'November', shortName: 'Nov', calendarMonth: 11 },
  { index: 4, name: 'December', shortName: 'Dec', calendarMonth: 12 },
  { index: 5, name: 'January', shortName: 'Jan', calendarMonth: 1 },
  { index: 6, name: 'February', shortName: 'Feb', calendarMonth: 2 },
  { index: 7, name: 'March', shortName: 'Mar', calendarMonth: 3 },
  { index: 8, name: 'April', shortName: 'Apr', calendarMonth: 4 },
  { index: 9, name: 'May', shortName: 'May', calendarMonth: 5 },
]

// Strategic importance for each month (Aug=0 through May=9)
export const STRATEGIC_MAP = {
  0: { label: 'KICKOFF', color: 'bg-warm', textColor: 'text-white', description: 'Marquee name. Set the tone. Get members excited.' },
  1: { label: 'MOMENTUM', color: 'bg-primary', textColor: 'text-white', description: 'Build on kickoff energy.' },
  2: { label: 'MOMENTUM', color: 'bg-primary', textColor: 'text-white', description: 'Sustain engagement.' },
  3: { label: 'MOMENTUM', color: 'bg-primary', textColor: 'text-white', description: 'Keep the arc rising.' },
  4: { label: 'NO EVENT', color: 'bg-gray-400', textColor: 'text-white', description: 'December — Holiday party handled separately. No Learning Chair event.' },
  5: { label: 'RENEWAL', color: 'bg-warm', textColor: 'text-white', description: 'Members decide on renewal. Must be strong.' },
  6: { label: 'RENEWAL', color: 'bg-warm', textColor: 'text-white', description: 'Critical retention period. Deliver value.' },
  7: { label: 'SUSTAIN', color: 'bg-primary', textColor: 'text-white', description: 'Maintain energy post-renewal.' },
  8: { label: 'SUSTAIN', color: 'bg-primary', textColor: 'text-white', description: 'Spring momentum.' },
  9: { label: 'GRATITUDE GALA', color: 'bg-warm', textColor: 'text-white', description: 'Final event. Celebrate the year. Leave them grateful.' },
}

// SAP partner tiers
export const SAP_TIERS = [
  { id: 'platinum', label: 'Platinum', color: '#6366f1' },
  { id: 'gold', label: 'Gold', color: '#f59e0b' },
  { id: 'silver', label: 'Silver', color: '#94a3b8' },
  { id: 'in_kind', label: 'In-Kind', color: '#22c55e' },
]

// SAP contribution types
export const SAP_CONTRIBUTION_TYPES = [
  { id: 'sponsorship', label: 'Sponsorship' },
  { id: 'workshop', label: 'Workshop' },
  { id: 'service', label: 'Service' },
  { id: 'other', label: 'Other' },
]

// Canonical SAP industries — used to populate the IndustryCombobox
// so chapters don't end up with three spellings of the same thing
// ("IT Services" / "Information Tech" / "Tech Services"). Free-form
// entry is still allowed for one-offs, but any new entry shows up as
// a suggestion to subsequent chairs once it's saved on a SAP.
export const SAP_INDUSTRIES = [
  'Accounting / CPA',
  'AI / Machine Learning',
  'Architecture',
  'Audio & Visual',
  'Banking',
  'Business Coaching',
  'Business Growth Specialist',
  'Business Services',
  'Catering',
  'Commercial Real Estate',
  'Construction',
  'Consulting',
  'Counseling',
  'Engineering',
  'Events / Hospitality',
  'Executive Coaching',
  'Executive Search / Recruiting',
  'Financial Planning',
  'Health Insurance / Benefits',
  'Healthcare',
  'Investment Banking / M&A',
  'IT Services',
  'Law',
  'Logistics / Supply Chain',
  'Manufacturing',
  'Marketing / Advertising',
  'Online Training Platform',
  'Payroll',
  'PEO',
  'Photography',
  'Printing',
  'Private Membership',
  'Property & Casualty Insurance',
  'Public Relations',
  'Real Estate',
  'Software',
  'Tax',
  'Technology',
  'Travel',
  'Virtual Assistants',
  'Wealth Management',
  'Other',
]

// SAP prospect pipeline stages (a SAP with status='prospect' moves
// through these on its way to becoming an active partner).
export const SAP_PIPELINE_STAGES = [
  { id: 'lead',         label: 'Lead',         color: '#94a3b8' },
  { id: 'contacted',    label: 'Contacted',    color: '#64648c' },
  { id: 'meeting',      label: 'Meeting',      color: '#3d46f2' },
  { id: 'negotiating',  label: 'Negotiating',  color: '#fa653c' },
  { id: 'signed',       label: 'Signed',       color: '#22c55e' },
]

// Renewal intent for an existing active SAP. Visible to SAP Chair
// (set/edit), and rolled up to President / Executive Director views
// so they know early which partner relationships are at risk.
export const SAP_RENEWAL_STATUSES = [
  { id: 'renewing',      label: 'Renewing',      color: '#22c55e' },
  { id: 'uncertain',     label: 'Uncertain',     color: '#f59e0b' },
  { id: 'not_renewing',  label: 'Not renewing',  color: '#dc2626' },
]

// Speaker pipeline stages
export const PIPELINE_STAGES = [
  { id: 'researching', label: 'Researching', color: '#64648c' },
  { id: 'outreach', label: 'Outreach', color: '#3d46f2' },
  { id: 'negotiating', label: 'Negotiating', color: '#fa653c' },
  { id: 'contracted', label: 'Contracted', color: '#ff346e' },
  { id: 'confirmed', label: 'Confirmed', color: '#22c55e' },
]

// Fields that live on speaker_pipeline (per fiscal year), NOT on the
// shared speakers library row. Source of truth for splitting a speaker
// form between the two tables — both SpeakersPage and the store's
// addSpeaker must agree, or new-speaker inserts leak pipeline columns
// into the speakers table and PostgREST rejects with "column not found".
export const SPEAKER_PIPELINE_FIELDS = [
  'pipeline_stage', 'fit_score',
  'fee_estimated', 'fee_actual',
  'fee_estimated_private', 'fee_actual_private',
  'contract_storage_path', 'contract_file_name',
  'w9_storage_path', 'w9_file_name',
  'notes',
  'deposit_amount', 'deposit_due_date',
  'final_payment_amount', 'final_payment_due_date',
  'payment_terms_notes',
]

// Venue pipeline stages
export const VENUE_PIPELINE_STAGES = [
  { id: 'researching', label: 'Researching', color: '#64648c' },
  { id: 'quote_requested', label: 'Quote Requested', color: '#3d46f2' },
  { id: 'site_visit', label: 'Site Visit', color: '#8b5cf6' },
  { id: 'negotiating', label: 'Negotiating', color: '#fa653c' },
  { id: 'contract', label: 'Contract', color: '#ff346e' },
  { id: 'confirmed', label: 'Confirmed', color: '#22c55e' },
]

// Venue archive reasons
export const ARCHIVE_REASONS = [
  { id: 'not_this_year', label: 'Not this year' },
  { id: 'too_expensive', label: 'Too expensive' },
  { id: 'bad_fit', label: 'Bad fit for our chapter' },
  { id: 'used_complete', label: 'Used - event complete' },
  { id: 'closed_unavailable', label: 'Closed or unavailable' },
  { id: 'other', label: 'Other' },
]

// Event formats (duration / structure)
export const EVENT_FORMATS = [
  { id: 'keynote', label: 'Keynote', duration: '~2 hrs', color: '#3d46f2' },
  { id: 'workshop_2hr', label: '2-Hour Workshop', duration: '2 hrs', color: '#8b5cf6' },
  { id: 'workshop_4hr', label: '4-Hour Workshop', duration: '4 hrs', color: '#fa653c' },
  { id: 'workshop_8hr', label: '8-Hour Workshop', duration: '8 hrs', color: '#ff346e' },
  { id: 'tour', label: 'Once-in-a-Lifetime Tour', duration: 'Varies', color: '#22c55e' },
  { id: 'dinner', label: 'Dinner / Social', duration: '~3 hrs', color: '#64648c' },
]

// Event types (The Four Buckets)
export const EVENT_TYPES = [
  { id: 'traditional', label: 'Traditional Learning', icon: 'GraduationCap', color: '#3d46f2' },
  { id: 'experiential', label: 'Experiential', icon: 'Rocket', color: '#fa653c' },
  { id: 'social', label: 'Social', icon: 'PartyPopper', color: '#ff346e' },
  { id: 'key_relationships', label: 'Key Relationships / SLP', icon: 'Heart', color: '#8b5cf6' },
]

// Owning-chair categories on a chapter event. Orthogonal to event_type:
// answers "which chair is responsible for this event," not "what kind of
// programming is it." Drives the unified Year Arc Calendar's color coding
// and per-chair filter chips so a Learning Chair can see when the
// Engagement Chair has a navigator mixer scheduled the same week as a
// speaker, etc. Defaults to 'learning' for any event without an explicit
// owner — matches the historical behaviour where the calendar was a
// Learning-Chair-only surface.
export const EVENT_OWNER_CHAIRS = [
  { id: 'learning',   label: 'Learning',   color: '#3d46f2' }, // indigo (matches primary)
  { id: 'engagement', label: 'Engagement', color: '#10b981' }, // emerald
  { id: 'membership', label: 'Membership', color: '#f59e0b' }, // amber
  { id: 'social',     label: 'Social',     color: '#ec4899' }, // pink
  { id: 'forum',      label: 'Forum',      color: '#8b5cf6' }, // violet
  { id: 'finance',    label: 'Finance',    color: '#14b8a6' }, // teal
  { id: 'board',      label: 'Board',      color: '#64748b' }, // slate
]

// Event status progression
export const EVENT_STATUSES = [
  { id: 'planning', label: 'Planning', color: '#64648c' },
  { id: 'speaker_confirmed', label: 'Speaker Confirmed', color: '#3d46f2' },
  { id: 'venue_confirmed', label: 'Venue Confirmed', color: '#fa653c' },
  { id: 'fully_confirmed', label: 'Fully Confirmed', color: '#22c55e' },
  { id: 'marketing', label: 'Marketing', color: '#ff346e' },
  { id: 'completed', label: 'Completed', color: '#0c0c31' },
  { id: 'cancelled', label: 'Cancelled', color: '#dc2626' },
]

// Budget categories
export const BUDGET_CATEGORIES = [
  { id: 'speaker_fee', label: 'Speaker Fee', color: '#3d46f2' },
  { id: 'food_beverage', label: 'Food & Beverage', color: '#ff346e' },
  { id: 'venue_rental', label: 'Venue Rental', color: '#fa653c' },
  { id: 'av_production', label: 'AV Production', color: '#8b5cf6' },
  { id: 'travel', label: 'Travel', color: '#22c55e' },
  { id: 'dinner', label: 'Dinner', color: '#f59e0b' },
  { id: 'other', label: 'Other', color: '#a3a3c2' },
]

// Contact methods
export const CONTACT_METHODS = [
  { id: 'direct', label: 'Direct' },
  { id: 'agency', label: 'Agency' },
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'referral', label: 'Referral' },
]

// AV quality levels
export const AV_QUALITY = [
  { id: 'excellent', label: 'Excellent' },
  { id: 'good', label: 'Good' },
  { id: 'fair', label: 'Fair' },
  { id: 'byob', label: 'BYOB (Bring Your Own)' },
]

// Contract checklist items
export const CONTRACT_CHECKLIST_ITEMS = [
  { id: 'jurisdiction_local', label: 'Jurisdiction set to event state', description: 'Cross out speaker\'s state. Contract governed by YOUR state.' },
  { id: 'indemnification_clause', label: 'Indemnification clause', description: 'Speaker holds chapter harmless for injuries/negligence.' },
  { id: 'mfn_clause', label: 'Most Favored Nations (MFN)', description: 'Ensures same baseline deal as others for multi-speaker events.' },
  { id: 'run_of_show_included', label: 'Run of Show included', description: 'Doors, sound check, performance times specified.' },
  { id: 'av_requirements_specified', label: 'AV requirements specified', description: 'Microphone, screens, recording rights, tech rider.' },
  { id: 'cancellation_terms', label: 'Cancellation terms', description: 'What happens if either party cancels.' },
  { id: 'recording_rights', label: 'Recording rights', description: 'Permission to record for chapter use.' },
  { id: 'contract_signed', label: 'Contract signed', description: 'Fully executed by both parties.' },
]

// Default marketing milestones (6-week countdown)
export const DEFAULT_MARKETING_MILESTONES = [
  { week: 6, name: 'Initial announcement email', description: 'Announce event with speaker details' },
  { week: 5, name: 'Speaker spotlight content', description: 'Bio, video clips, why this matters' },
  { week: 4, name: 'FOMO email #1', description: '"Look who\'s coming" with early RSVPs' },
  { week: 3, name: 'Social media push', description: 'Share across chapter social channels' },
  { week: 2, name: 'FOMO email #2', description: 'Seats filling, last chance energy' },
  { week: 1, name: 'Final reminder + logistics', description: 'Time, location, parking, dress code' },
]

// Board chairs and staff positions
export const CHAIR_ROLES = [
  { id: 'president', label: 'President' },
  { id: 'president_elect', label: 'President Elect' },
  { id: 'president_elect_elect', label: 'President Elect-Elect' },
  { id: 'learning_chair_elect', label: 'Learning Chair Elect' },
  { id: 'finance', label: 'Finance' },
  { id: 'governance', label: 'Governance' },
  { id: 'membership', label: 'Membership' },
  { id: 'forum_health', label: 'Forum Health' },
  { id: 'forum_placement', label: 'Forum Placement' },
  { id: 'learning', label: 'Learning' },
  { id: 'member_engagement', label: 'Member Engagement' },
  { id: 'marketing_communications', label: 'Marketing and Communications' },
  { id: 'strategic_alliances', label: 'Strategic Alliances' },
  { id: 'mentorship', label: 'Mentorship' },
  { id: 'social', label: 'Social' },
  { id: 'gsea', label: 'GSEA' },
  { id: 'myeo', label: 'MyEO' },
  { id: 'slp_champion', label: 'SLP Champion' },
  { id: 'accelerator', label: 'Accelerator' },
  { id: 'executive_director', label: 'Executive Director', isStaff: true },
  { id: 'experience_coordinator', label: 'Experience Coordinator', isStaff: true },
  { id: 'executive_assistant', label: 'Executive Assistant', isStaff: true },
]

// Chair report statuses
export const REPORT_STATUSES = [
  { id: 'draft', label: 'Draft', color: '#64648c' },
  { id: 'submitted', label: 'Submitted', color: '#3d46f2' },
  { id: 'reviewed', label: 'Reviewed', color: '#22c55e' },
]

// Communication audiences
export const COMM_AUDIENCES = [
  { id: 'all_members', label: 'All Members' },
  { id: 'board_only', label: 'Board Only' },
  { id: 'chairs_only', label: 'Chairs Only' },
  { id: 'custom', label: 'Custom' },
]

// Forum health thresholds
export const FORUM_HEALTH = [
  { min: 8, max: 10, label: 'Thriving', color: '#22c55e' },
  { min: 5, max: 7, label: 'Stable', color: '#f59e0b' },
  { min: 1, max: 4, label: 'Needs Attention', color: '#ef4444' },
]

// Document types for event uploads
export const DOCUMENT_TYPES = [
  { id: 'contract', label: 'Contract', color: '#3d46f2' },
  { id: 'loi', label: 'Letter of Intent', color: '#8b5cf6' },
  { id: 'rider', label: 'Rider', color: '#fa653c' },
  { id: 'insurance', label: 'Insurance', color: '#22c55e' },
  { id: 'invoice', label: 'Invoice', color: '#ff346e' },
  { id: 'other', label: 'Other', color: '#64648c' },
]

// File upload constraints
export const MAX_FILE_SIZE_MB = 10
export const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/webp',
]

// User roles
export const USER_ROLES = [
  { id: 'super_admin', label: 'Super Admin', access: 'full' },
  { id: 'regional_learning_chair_expert', label: 'Regional Learning Chair Expert', access: 'regional' },
  { id: 'learning_chair', label: 'Learning Chair', access: 'full' },
  { id: 'chapter_experience_coordinator', label: 'Chapter Experience Coordinator', access: 'full' },
  { id: 'chapter_executive_director', label: 'Chapter Executive Director', access: 'full' },
  { id: 'committee_member', label: 'Committee Member', access: 'edit_limited' },
  { id: 'board_liaison', label: 'Board Liaison', access: 'view' },
  { id: 'member', label: 'Member', access: 'portal_only' },
]

// EO regions. Intentionally a flexible freeform list for V1 — John-Scott
// doesn't have the authoritative EO region list yet, but we need "U.S. West"
// in prod today so the Regional Learning Chair Expert demo can go live.
// Add more entries as the real list surfaces; keep 'Other' as a release
// valve so chapters can still be tagged while the list is incomplete.
export const EO_REGIONS = [
  { id: 'us_west', label: 'U.S. West' },
  { id: 'other', label: 'Other (not yet classified)' },
]
