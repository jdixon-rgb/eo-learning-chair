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
  0: { label: 'KICKOFF', color: 'bg-eo-coral', textColor: 'text-white', description: 'Marquee name. Set the tone. Get members excited.' },
  1: { label: 'MOMENTUM', color: 'bg-eo-blue', textColor: 'text-white', description: 'Build on kickoff energy.' },
  2: { label: 'MOMENTUM', color: 'bg-eo-blue', textColor: 'text-white', description: 'Sustain engagement.' },
  3: { label: 'MOMENTUM', color: 'bg-eo-blue', textColor: 'text-white', description: 'Keep the arc rising.' },
  4: { label: 'NO EVENT', color: 'bg-gray-400', textColor: 'text-white', description: 'December — Holiday party handled separately. No Learning Chair event.' },
  5: { label: 'RENEWAL', color: 'bg-eo-coral', textColor: 'text-white', description: 'Members decide on renewal. Must be strong.' },
  6: { label: 'RENEWAL', color: 'bg-eo-coral', textColor: 'text-white', description: 'Critical retention period. Deliver value.' },
  7: { label: 'SUSTAIN', color: 'bg-eo-blue', textColor: 'text-white', description: 'Maintain energy post-renewal.' },
  8: { label: 'SUSTAIN', color: 'bg-eo-blue', textColor: 'text-white', description: 'Spring momentum.' },
  9: { label: 'GRATITUDE GALA', color: 'bg-eo-coral', textColor: 'text-white', description: 'Final event. Celebrate the year. Leave them grateful.' },
}

// Speaker pipeline stages
export const PIPELINE_STAGES = [
  { id: 'researching', label: 'Researching', color: '#64648c' },
  { id: 'outreach', label: 'Outreach', color: '#3d46f2' },
  { id: 'negotiating', label: 'Negotiating', color: '#fa653c' },
  { id: 'contracted', label: 'Contracted', color: '#ff346e' },
  { id: 'confirmed', label: 'Confirmed', color: '#22c55e' },
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
  { id: 'marketing', label: 'Marketing', color: '#64648c' },
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

// Chair roles for board reports
export const CHAIR_ROLES = [
  { id: 'learning_chair', label: 'Learning Chair' },
  { id: 'membership_chair', label: 'Membership Chair' },
  { id: 'communications_chair', label: 'Communications Chair' },
  { id: 'community_chair', label: 'Community Chair' },
  { id: 'forum_chair', label: 'Forum Chair' },
  { id: 'social_chair', label: 'Social Chair' },
  { id: 'sponsorship_chair', label: 'Sponsorship Chair' },
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
  { id: 'learning_chair', label: 'Learning Chair', access: 'full' },
  { id: 'chapter_experience_coordinator', label: 'Chapter Experience Coordinator', access: 'full' },
  { id: 'chapter_executive_director', label: 'Chapter Executive Director', access: 'full' },
  { id: 'committee_member', label: 'Committee Member', access: 'edit_limited' },
  { id: 'board_liaison', label: 'Board Liaison', access: 'view' },
  { id: 'member', label: 'Member', access: 'portal_only' },
]
