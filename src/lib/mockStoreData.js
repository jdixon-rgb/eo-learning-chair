// Full-shape store fixtures for the EO Phoenix mock chapter.
//
// When a chapter-tier persona is active in Mock Mode (Karl or Sarah), the
// main store injects this data instead of hydrating from Supabase. That way
// the real Dashboard / Year Arc / Events / Speakers / Budget / Scenarios
// pages all render as if the chapter were fully populated with real data —
// giving the demo audience something they can genuinely click through.

const PHX = 'mock-chapter-phoenix'

// ── Chapter ──────────────────────────────────────────────────────────
export const PHX_CHAPTER = {
  id: PHX,
  name: 'EO Phoenix',
  region: 'US West',
  fiscal_year_start: 7, // July
  total_budget: 500000,
  president_theme: 'Compound Growth',
  // Populated by the backfill migration in real deployments; harmless here
  anthropic_api_key: null,
}

// ── Venues ───────────────────────────────────────────────────────────
export const PHX_VENUES = [
  {
    id: 'mock-venue-arizona-biltmore',
    chapter_id: PHX,
    name: 'Arizona Biltmore',
    address: '2400 E Missouri Ave, Phoenix, AZ 85016',
    city: 'Phoenix',
    state: 'AZ',
    zip: '85016',
    category: 'hotel',
    capacity_estimate: 350,
    description: 'Historic resort, board-chosen anchor venue for high-profile speakers.',
    staff_rating: 9,
    av_quality: 'excellent',
    archived_at: null,
    pipeline_stage: 'confirmed',
  },
  {
    id: 'mock-venue-the-clayton',
    chapter_id: PHX,
    name: 'The Clayton House',
    address: '3719 E Indian School Rd, Phoenix, AZ 85018',
    city: 'Phoenix',
    state: 'AZ',
    zip: '85018',
    category: 'private',
    capacity_estimate: 120,
    description: 'Intimate private estate for experiential events.',
    staff_rating: 8,
    av_quality: 'good',
    archived_at: null,
    pipeline_stage: 'confirmed',
  },
  {
    id: 'mock-venue-musical-instrument',
    chapter_id: PHX,
    name: 'Musical Instrument Museum',
    address: '4725 E Mayo Blvd, Phoenix, AZ 85050',
    city: 'Phoenix',
    state: 'AZ',
    zip: '85050',
    category: 'museum',
    capacity_estimate: 200,
    description: 'Unique cultural venue — used for Key Relationships night.',
    staff_rating: 9,
    av_quality: 'excellent',
    archived_at: null,
    pipeline_stage: 'confirmed',
  },
  {
    id: 'mock-venue-desert-ridge',
    chapter_id: PHX,
    name: 'JW Marriott Desert Ridge',
    address: '5350 E Marriott Dr, Phoenix, AZ 85054',
    city: 'Phoenix',
    state: 'AZ',
    zip: '85054',
    category: 'hotel',
    capacity_estimate: 500,
    description: 'Large-capacity resort — retreat-style kickoff weekends.',
    staff_rating: 7,
    av_quality: 'excellent',
    archived_at: null,
    pipeline_stage: 'contract',
  },
  {
    id: 'mock-venue-top-golf',
    chapter_id: PHX,
    name: 'Topgolf Scottsdale',
    address: '9500 E Talking Stick Way, Scottsdale, AZ 85256',
    city: 'Scottsdale',
    state: 'AZ',
    zip: '85256',
    category: 'outdoor',
    capacity_estimate: 150,
    description: 'Social event backup — forum parties and holiday mixer.',
    staff_rating: 6,
    av_quality: 'fair',
    archived_at: null,
    pipeline_stage: 'site_visit',
  },
]

// ── Speakers (library) ───────────────────────────────────────────────
export const PHX_SPEAKERS = [
  {
    id: 'mock-spk-ismail',
    chapter_id: PHX,
    name: 'Salim Ismail',
    topic: 'Exponential Organizations',
    bio: 'Founding executive director of Singularity University. Author of Exponential Organizations.',
    fee_range_low: 40000,
    fee_range_high: 55000,
    contact_method: 'agency',
    agency_contact: 'Keppler Speakers',
    sizzle_reel_url: 'https://example.com/ismail',
  },
  {
    id: 'mock-spk-seligman',
    chapter_id: PHX,
    name: 'Dr. Martin Seligman',
    topic: 'Positive Psychology & Leadership',
    bio: 'Father of positive psychology, University of Pennsylvania.',
    fee_range_low: 35000,
    fee_range_high: 50000,
    contact_method: 'agency',
  },
  {
    id: 'mock-spk-grenny',
    chapter_id: PHX,
    name: 'Joseph Grenny',
    topic: 'Crucial Conversations',
    bio: 'Co-author of the Crucial Conversations series.',
    fee_range_low: 25000,
    fee_range_high: 35000,
    contact_method: 'direct',
  },
  {
    id: 'mock-spk-wiseman',
    chapter_id: PHX,
    name: 'Liz Wiseman',
    topic: 'Multipliers — How the Best Leaders Make Everyone Smarter',
    bio: 'Executive advisor, NYT bestseller.',
    fee_range_low: 30000,
    fee_range_high: 45000,
    contact_method: 'agency',
  },
  {
    id: 'mock-spk-hyatt',
    chapter_id: PHX,
    name: 'Michael Hyatt',
    topic: 'Full Focus — Time & Priority Mastery',
    bio: 'Former CEO Thomas Nelson, founder Full Focus.',
    fee_range_low: 20000,
    fee_range_high: 30000,
    contact_method: 'direct',
  },
  {
    id: 'mock-spk-horst',
    chapter_id: PHX,
    name: 'Horst Schulze',
    topic: 'Ritz-Carlton & Creating Excellence',
    bio: 'Co-founder Ritz-Carlton, Capella Hotels.',
    fee_range_low: 30000,
    fee_range_high: 40000,
    contact_method: 'agency',
  },
  {
    id: 'mock-spk-bird',
    chapter_id: PHX,
    name: 'Larry Bird (Local)',
    topic: 'Operator Stories — Scaling in AZ',
    bio: 'Local Phoenix operator panel.',
    fee_range_low: 0,
    fee_range_high: 2000,
    contact_method: 'referral',
  },
  {
    id: 'mock-spk-sauer',
    chapter_id: PHX,
    name: 'Amy Sauer',
    topic: 'Culture Architecture for 100-person Teams',
    bio: 'Former Culture VP at Basecamp.',
    fee_range_low: 15000,
    fee_range_high: 22000,
    contact_method: 'direct',
  },
  {
    id: 'mock-spk-novak',
    chapter_id: PHX,
    name: 'David Novak',
    topic: 'Heart of Leadership',
    bio: 'Founder and former CEO of Yum! Brands.',
    fee_range_low: 45000,
    fee_range_high: 60000,
    contact_method: 'agency',
  },
  {
    id: 'mock-spk-hsieh',
    chapter_id: PHX,
    name: 'Estelle Hsieh',
    topic: 'Unit Economics for Bootstrappers',
    bio: 'CFO fractional, ex-Index Ventures.',
    fee_range_low: 8000,
    fee_range_high: 12000,
    contact_method: 'linkedin',
  },
  {
    id: 'mock-spk-patel',
    chapter_id: PHX,
    name: 'Neil Patel',
    topic: 'Marketing for Founders',
    bio: 'Co-founder Crazy Egg, NP Digital.',
    fee_range_low: 25000,
    fee_range_high: 35000,
    contact_method: 'direct',
  },
  {
    id: 'mock-spk-blake',
    chapter_id: PHX,
    name: 'Blake Mycoskie',
    topic: 'Conscious Capitalism in Practice',
    bio: 'Founder TOMS Shoes.',
    fee_range_low: 30000,
    fee_range_high: 42000,
    contact_method: 'agency',
  },
]

// ── Speaker Pipeline (FY 2026-2027 entries) ──────────────────────────
// Shape mirrors speaker_pipeline table rows
export const PHX_SPEAKER_PIPELINE = [
  { id: 'pl-1', chapter_id: PHX, speaker_id: 'mock-spk-ismail', fiscal_year: '2026-2027', pipeline_stage: 'confirmed', fit_score: 9, estimated_fee: 45000, actual_fee: 45000, notes: 'Confirmed for Aug kickoff.' },
  { id: 'pl-2', chapter_id: PHX, speaker_id: 'mock-spk-seligman', fiscal_year: '2026-2027', pipeline_stage: 'contracted', fit_score: 8, estimated_fee: 40000, actual_fee: 38000, notes: '' },
  { id: 'pl-3', chapter_id: PHX, speaker_id: 'mock-spk-grenny', fiscal_year: '2026-2027', pipeline_stage: 'confirmed', fit_score: 9, estimated_fee: 30000, actual_fee: 28500, notes: 'Jan event locked in.' },
  { id: 'pl-4', chapter_id: PHX, speaker_id: 'mock-spk-wiseman', fiscal_year: '2026-2027', pipeline_stage: 'negotiating', fit_score: 8, estimated_fee: 38000, actual_fee: null, notes: 'Agency came back $2K under ask.' },
  { id: 'pl-5', chapter_id: PHX, speaker_id: 'mock-spk-hyatt', fiscal_year: '2026-2027', pipeline_stage: 'outreach', fit_score: 7, estimated_fee: 25000, actual_fee: null, notes: 'Initial email Oct 5.' },
  { id: 'pl-6', chapter_id: PHX, speaker_id: 'mock-spk-horst', fiscal_year: '2026-2027', pipeline_stage: 'researching', fit_score: 8, estimated_fee: 35000, actual_fee: null, notes: '' },
  { id: 'pl-7', chapter_id: PHX, speaker_id: 'mock-spk-sauer', fiscal_year: '2026-2027', pipeline_stage: 'contracted', fit_score: 7, estimated_fee: 20000, actual_fee: 18500, notes: 'Mar experiential.' },
  { id: 'pl-8', chapter_id: PHX, speaker_id: 'mock-spk-novak', fiscal_year: '2026-2027', pipeline_stage: 'researching', fit_score: 9, estimated_fee: 50000, actual_fee: null, notes: 'Stretch pick.' },
  { id: 'pl-9', chapter_id: PHX, speaker_id: 'mock-spk-hsieh', fiscal_year: '2026-2027', pipeline_stage: 'contracted', fit_score: 6, estimated_fee: 10000, actual_fee: 9500, notes: 'Feb deep-dive.' },
  { id: 'pl-10', chapter_id: PHX, speaker_id: 'mock-spk-patel', fiscal_year: '2026-2027', pipeline_stage: 'negotiating', fit_score: 7, estimated_fee: 28000, actual_fee: null, notes: '' },
  { id: 'pl-11', chapter_id: PHX, speaker_id: 'mock-spk-blake', fiscal_year: '2026-2027', pipeline_stage: 'outreach', fit_score: 8, estimated_fee: 35000, actual_fee: null, notes: 'Referred by Austin chapter.' },
]

// ── Events (11 across the fiscal year, month indexes for Aug-Jun) ────
// Matches the shape in events table + expected UI fields
export const PHX_EVENTS = [
  { id: 'mock-evt-aug', chapter_id: PHX, title: 'The Imagination Age — Salim Ismail', event_date: '2026-08-14', event_time: '17:30', month_index: 1, event_type: 'traditional', event_format: 'in_person', status: 'fully_confirmed', speaker_id: 'mock-spk-ismail', venue_id: 'mock-venue-arizona-biltmore', strategic_importance: 'tentpole', expected_attendance: 180, day_chair_name: 'Sarah Chen', notes: 'Kickoff event, board preview pre-event.', theme_connection: 'Compound Growth — exponential thinking frame for the year.', open_to_saps: true },
  { id: 'mock-evt-sep', chapter_id: PHX, title: 'CHANGE: Joyful Rebellion', event_date: '2026-09-18', event_time: '17:30', month_index: 2, event_type: 'traditional', event_format: 'in_person', status: 'fully_confirmed', speaker_id: 'mock-spk-seligman', venue_id: 'mock-venue-arizona-biltmore', strategic_importance: 'core', expected_attendance: 150, day_chair_name: 'Michael Torres' },
  { id: 'mock-evt-sep2', chapter_id: PHX, title: 'CHANGE: AI-Readiness Workshop', event_date: '2026-09-26', event_time: '09:00', month_index: 2, event_type: 'experiential', event_format: 'workshop', status: 'speaker_confirmed', venue_id: 'mock-venue-the-clayton', strategic_importance: 'core', expected_attendance: 40 },
  { id: 'mock-evt-oct', chapter_id: PHX, title: 'DISCIPLINE: No Excuses', event_date: '2026-10-15', event_time: '17:30', month_index: 3, event_type: 'traditional', event_format: 'in_person', status: 'venue_confirmed', speaker_id: 'mock-spk-hyatt', venue_id: 'mock-venue-arizona-biltmore', strategic_importance: 'core', expected_attendance: 140 },
  { id: 'mock-evt-nov', chapter_id: PHX, title: 'RELATIONSHIPS: AI-Assisted Intimacy', event_date: '2026-11-13', event_time: '17:30', month_index: 4, event_type: 'key_relationships', event_format: 'in_person', status: 'speaker_confirmed', speaker_id: 'mock-spk-horst', venue_id: 'mock-venue-musical-instrument', strategic_importance: 'tentpole', expected_attendance: 200 },
  { id: 'mock-evt-jan', chapter_id: PHX, title: 'Crucial Conversations — Joseph Grenny', event_date: '2027-01-22', event_time: '17:30', month_index: 6, event_type: 'traditional', event_format: 'in_person', status: 'fully_confirmed', speaker_id: 'mock-spk-grenny', venue_id: 'mock-venue-arizona-biltmore', strategic_importance: 'core', expected_attendance: 165 },
  { id: 'mock-evt-feb', chapter_id: PHX, title: 'Unit Economics Deep-Dive', event_date: '2027-02-19', event_time: '07:30', month_index: 7, event_type: 'traditional', event_format: 'breakfast', status: 'speaker_confirmed', speaker_id: 'mock-spk-hsieh', venue_id: 'mock-venue-the-clayton', strategic_importance: 'core', expected_attendance: 60 },
  { id: 'mock-evt-mar', chapter_id: PHX, title: 'Culture Architecture Workshop', event_date: '2027-03-19', event_time: '09:00', month_index: 8, event_type: 'experiential', event_format: 'workshop', status: 'speaker_confirmed', speaker_id: 'mock-spk-sauer', venue_id: 'mock-venue-desert-ridge', strategic_importance: 'core', expected_attendance: 50 },
  { id: 'mock-evt-apr', chapter_id: PHX, title: 'Multipliers — Liz Wiseman', event_date: '2027-04-16', event_time: '17:30', month_index: 9, event_type: 'traditional', event_format: 'in_person', status: 'planning', speaker_id: 'mock-spk-wiseman', venue_id: 'mock-venue-arizona-biltmore', strategic_importance: 'core', expected_attendance: 150 },
  { id: 'mock-evt-may', chapter_id: PHX, title: 'Forum Celebration Night', event_date: '2027-05-14', event_time: '18:00', month_index: 10, event_type: 'social', event_format: 'social', status: 'planning', venue_id: 'mock-venue-top-golf', strategic_importance: 'core', expected_attendance: 220 },
  { id: 'mock-evt-jun', chapter_id: PHX, title: 'Year Close: Theme Reveal', event_date: '2027-06-18', event_time: '17:30', month_index: 11, event_type: 'social', event_format: 'in_person', status: 'planning', venue_id: 'mock-venue-arizona-biltmore', strategic_importance: 'tentpole', expected_attendance: 200 },
]

// ── Budget items (each event × key categories) ───────────────────────
// Sums across all events → roughly $330K budgeted (matches Regional view)
function bi(id, eventId, category, budget_amount, contracted_amount = 0, actual_amount = 0) {
  return { id, chapter_id: PHX, event_id: eventId, category, budget_amount, contracted_amount, actual_amount, notes: '' }
}
export const PHX_BUDGET_ITEMS = [
  // Aug — Ismail
  bi('b-aug-1', 'mock-evt-aug', 'speaker_fee', 45000, 45000, 0),
  bi('b-aug-2', 'mock-evt-aug', 'food_beverage', 18000, 15500, 0),
  bi('b-aug-3', 'mock-evt-aug', 'venue_rental', 12000, 12000, 0),
  bi('b-aug-4', 'mock-evt-aug', 'av_production', 8500, 7800, 0),
  bi('b-aug-5', 'mock-evt-aug', 'travel', 6000, 4200, 0),
  // Sep — Seligman
  bi('b-sep-1', 'mock-evt-sep', 'speaker_fee', 38000, 38000, 0),
  bi('b-sep-2', 'mock-evt-sep', 'food_beverage', 16000, 14200, 0),
  bi('b-sep-3', 'mock-evt-sep', 'venue_rental', 10000, 10000, 0),
  bi('b-sep-4', 'mock-evt-sep', 'av_production', 8000, 7500, 0),
  // Sep AI workshop
  bi('b-sep2-1', 'mock-evt-sep2', 'speaker_fee', 8000, 0, 0),
  bi('b-sep2-2', 'mock-evt-sep2', 'food_beverage', 4500, 0, 0),
  bi('b-sep2-3', 'mock-evt-sep2', 'venue_rental', 3500, 3500, 0),
  // Oct — Hyatt
  bi('b-oct-1', 'mock-evt-oct', 'speaker_fee', 28000, 0, 0),
  bi('b-oct-2', 'mock-evt-oct', 'food_beverage', 15000, 0, 0),
  bi('b-oct-3', 'mock-evt-oct', 'venue_rental', 10000, 10000, 0),
  bi('b-oct-4', 'mock-evt-oct', 'av_production', 7000, 0, 0),
  // Nov — Horst (tentpole)
  bi('b-nov-1', 'mock-evt-nov', 'speaker_fee', 36000, 0, 0),
  bi('b-nov-2', 'mock-evt-nov', 'food_beverage', 22000, 0, 0),
  bi('b-nov-3', 'mock-evt-nov', 'venue_rental', 14000, 0, 0),
  bi('b-nov-4', 'mock-evt-nov', 'av_production', 10000, 0, 0),
  bi('b-nov-5', 'mock-evt-nov', 'travel', 4500, 0, 0),
  // Jan — Grenny
  bi('b-jan-1', 'mock-evt-jan', 'speaker_fee', 28500, 28500, 0),
  bi('b-jan-2', 'mock-evt-jan', 'food_beverage', 16000, 0, 0),
  bi('b-jan-3', 'mock-evt-jan', 'venue_rental', 10000, 0, 0),
  bi('b-jan-4', 'mock-evt-jan', 'av_production', 7500, 0, 0),
  // Feb — Hsieh
  bi('b-feb-1', 'mock-evt-feb', 'speaker_fee', 9500, 9500, 0),
  bi('b-feb-2', 'mock-evt-feb', 'food_beverage', 6500, 0, 0),
  bi('b-feb-3', 'mock-evt-feb', 'venue_rental', 3500, 3500, 0),
  // Mar — Sauer
  bi('b-mar-1', 'mock-evt-mar', 'speaker_fee', 18500, 18500, 0),
  bi('b-mar-2', 'mock-evt-mar', 'food_beverage', 9000, 0, 0),
  bi('b-mar-3', 'mock-evt-mar', 'venue_rental', 6500, 0, 0),
  // Apr — Wiseman
  bi('b-apr-1', 'mock-evt-apr', 'speaker_fee', 38000, 0, 0),
  bi('b-apr-2', 'mock-evt-apr', 'food_beverage', 16000, 0, 0),
  bi('b-apr-3', 'mock-evt-apr', 'venue_rental', 10000, 0, 0),
  bi('b-apr-4', 'mock-evt-apr', 'av_production', 7500, 0, 0),
  // May Social
  bi('b-may-1', 'mock-evt-may', 'food_beverage', 11000, 0, 0),
  bi('b-may-2', 'mock-evt-may', 'venue_rental', 6000, 0, 0),
  // Jun Year close
  bi('b-jun-1', 'mock-evt-jun', 'food_beverage', 14000, 0, 0),
  bi('b-jun-2', 'mock-evt-jun', 'venue_rental', 12000, 0, 0),
  bi('b-jun-3', 'mock-evt-jun', 'av_production', 6000, 0, 0),
]

// ── SAPs (Strategic Alliance Partners / sponsors) ────────────────────
export const PHX_SAPS = [
  {
    id: 'mock-sap-foundry',
    chapter_id: PHX,
    name: 'Desert Foundry (Ops Consulting)',
    company: 'Desert Foundry',
    industry: 'Operations Consulting',
    tier: 'gold',
    status: 'active',
    website: 'https://example.com',
  },
  {
    id: 'mock-sap-cactus',
    chapter_id: PHX,
    name: 'Cactus Legal Partners',
    company: 'Cactus Legal',
    industry: 'Legal',
    tier: 'silver',
    status: 'active',
  },
  {
    id: 'mock-sap-valley',
    chapter_id: PHX,
    name: 'Valley Wealth Advisors',
    company: 'Valley Wealth',
    industry: 'Wealth Management',
    tier: 'bronze',
    status: 'active',
  },
]

// ── Scenarios (a couple of saved budget scenarios) ───────────────────
export const PHX_SCENARIOS = [
  {
    id: 'mock-scen-aggressive',
    chapter_id: PHX,
    name: 'Aggressive Tentpole',
    fiscal_year: '2026-2027',
    notes: 'Swap Wiseman for Novak ($50K). Raise Nov budget.',
    created_at: '2026-04-01T00:00:00Z',
  },
  {
    id: 'mock-scen-lean',
    chapter_id: PHX,
    name: 'Lean Year',
    fiscal_year: '2026-2027',
    notes: 'Replace Aug tentpole with local panel. Save $35K.',
    created_at: '2026-04-10T00:00:00Z',
  },
]

// ── Main entry point used by the store ───────────────────────────────
export function getMockStoreData(chapterId) {
  if (chapterId !== PHX) {
    // Only Phoenix is fully populated for v0.2. Denver/Seattle return a
    // minimal shell so Julie's regional cards still work; deep clicks go
    // nowhere interesting. Polish pass in v1.0.
    return null
  }
  return {
    chapter: PHX_CHAPTER,
    venues: PHX_VENUES,
    speakers: PHX_SPEAKERS,
    speakerPipeline: PHX_SPEAKER_PIPELINE,
    events: PHX_EVENTS,
    budgetItems: PHX_BUDGET_ITEMS,
    saps: PHX_SAPS,
    scenarios: PHX_SCENARIOS,
    contractChecklists: [],
    eventDocuments: [],
  }
}
