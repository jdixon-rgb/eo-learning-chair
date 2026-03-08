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
  4: { label: 'HOLIDAY', color: 'bg-eo-pink', textColor: 'text-white', description: 'Social/celebratory event. Year-end energy.' },
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

// User roles
export const USER_ROLES = [
  { id: 'learning_chair', label: 'Learning Chair' },
  { id: 'president', label: 'Chapter President' },
  { id: 'staff', label: 'Chapter Staff' },
  { id: 'viewer', label: 'Viewer' },
]
