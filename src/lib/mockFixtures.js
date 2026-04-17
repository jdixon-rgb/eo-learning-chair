// Mock fixtures for Demo Mode.
//
// Shape mirrors what the live stores would hydrate from Supabase: chapters,
// chapter_members, events (with NPS feedback), speakers, budget_items, etc.
// Everything here is deliberately obvious-fake (Acme-style names, round numbers)
// and designed to tell a coaching story to a Regional Learning Chair:
//   - One thriving chapter, one mid, one struggling — so "who needs help?"
//     has a non-trivial answer the demo audience can immediately see.
//
// Nothing in this file touches Supabase. Consumed by useMockData() in store.js
// and the persona-switching machinery.

// ── Regions ──────────────────────────────────────────────────────────
export const MOCK_REGIONS = [
  { id: 'region-us-west', name: 'US West', chapter_count: 15 },
  { id: 'region-us-east', name: 'US East', chapter_count: 12 },
  { id: 'region-emea', name: 'EMEA', chapter_count: 18 },
]

// ── Chapters (US West, 3 shown — healthy / mid / struggling) ─────────
export const MOCK_CHAPTERS = [
  {
    id: 'mock-chapter-phoenix',
    name: 'EO Phoenix',
    region_id: 'region-us-west',
    fiscal_year_start: 7,
    total_budget: 500000,
    president_theme: 'Compound Growth',
    president_name: 'Michael Torres',
    learning_chair_name: 'Sarah Chen',
    learning_chair_email: 'sarah.chen@demo.local',
    nps_avg: 72,
    budget_used_pct: 48,
    health: 'healthy',
    pipeline_count: 12,
    events_planned: 11,
  },
  {
    id: 'mock-chapter-denver',
    name: 'EO Denver',
    region_id: 'region-us-west',
    fiscal_year_start: 7,
    total_budget: 420000,
    president_theme: 'Altitude',
    president_name: 'Priya Patel',
    learning_chair_name: 'Marcus Wu',
    learning_chair_email: 'marcus.wu@demo.local',
    nps_avg: 54,
    budget_used_pct: 73,
    health: 'mid',
    pipeline_count: 7,
    events_planned: 9,
  },
  {
    id: 'mock-chapter-seattle',
    name: 'EO Seattle',
    region_id: 'region-us-west',
    fiscal_year_start: 7,
    total_budget: 380000,
    president_theme: 'Reinvention',
    president_name: 'Dana Kirkland',
    learning_chair_name: 'Karen Becker',
    learning_chair_email: 'karen.becker@demo.local',
    nps_avg: 23,
    budget_used_pct: 91,
    health: 'struggling',
    pipeline_count: 3,
    events_planned: 6,
  },
]

// ── Personas (all cover letter identities Julie/Steve/etc will slip into) ──
// The persona switcher at the top of the demo app reads from this list.
export const MOCK_PERSONAS = [
  {
    id: 'persona-marcus',
    name: 'Marcus Delacroix',
    role_label: 'Global Learning Chair',
    tier: 'global',
    scope: 'All regions',
    avatar_emoji: '🌐',
    description: 'Sits above all regions. Sees cross-region trends.',
    // The role this persona simulates when clicked. Uses existing viewAsRole
    // mechanism; new role values below are demo-only and aren't in the real
    // profiles.role constraint.
    viewAsRole: 'global_learning_chair',
  },
  {
    id: 'persona-julie',
    name: 'Julie Broad',
    role_label: 'Regional Learning Chair — US West',
    tier: 'regional',
    scope: 'US West · 15 chapters',
    avatar_emoji: '📚',
    description: 'Coaches Learning Chairs across US West. Sees NPS + budget health for every chapter.',
    viewAsRole: 'regional_learning_chair',
  },
  {
    id: 'persona-karl',
    name: 'Karl Bickmore',
    role_label: 'Chapter President — EO Phoenix',
    tier: 'chapter',
    scope: 'EO Phoenix',
    avatar_emoji: '👔',
    description: 'Runs one chapter. Sees everything happening inside it.',
    viewAsRole: 'president',
    chapter_id: 'mock-chapter-phoenix',
  },
  {
    id: 'persona-sarah',
    name: 'Sarah Chen',
    role_label: 'Chapter Learning Chair — EO Phoenix',
    tier: 'chapter',
    scope: 'EO Phoenix',
    avatar_emoji: '🎓',
    description: "Individual chapter's Learning Chair surface — the original view of this app.",
    viewAsRole: 'learning_chair',
    chapter_id: 'mock-chapter-phoenix',
  },
]

// ── Event feedback (NPS + quotes) for the coaching view ──────────────
// Each chapter gets representative recent events + feedback quotes.
// The Regional Learning Chair surface surfaces this to make "why is NPS low"
// actionable rather than abstract.
export const MOCK_EVENT_FEEDBACK = {
  'mock-chapter-phoenix': [
    {
      event_title: 'The Imagination Age — Salim Ismail',
      event_date: '2026-02-12',
      nps_score: 78,
      takeaway: 'Exponential orgs need MTPs, not just OKRs. We have to rethink our 3-year plan.',
      highlight_quote: 'Best speaker we\'ve had all year. Pages of notes.',
    },
    {
      event_title: 'CHANGE: Joyful Rebellion',
      event_date: '2026-01-15',
      nps_score: 66,
      takeaway: 'Conflict done right is the fastest path to trust.',
      highlight_quote: 'Made me reconsider how I run my leadership team.',
    },
  ],
  'mock-chapter-denver': [
    {
      event_title: 'Scaling Operations — Guest CFO',
      event_date: '2026-02-18',
      nps_score: 62,
      takeaway: 'Unit economics over revenue. Always.',
      highlight_quote: 'Solid speaker but the room was fighting A/V issues the whole time.',
    },
    {
      event_title: 'Leadership in Downturns',
      event_date: '2026-01-22',
      nps_score: 46,
      takeaway: 'Cash discipline. The rest is noise.',
      highlight_quote: 'Topic was timely but the speaker felt under-prepared. Delivery flat.',
    },
  ],
  'mock-chapter-seattle': [
    {
      event_title: 'Branding Workshop — Local Agency',
      event_date: '2026-02-20',
      nps_score: 28,
      takeaway: 'Nothing specific. Felt generic.',
      highlight_quote: 'The speaker didn\'t land. Felt like a checkbox event.',
    },
    {
      event_title: 'Year Kickoff: Vision 2026',
      event_date: '2026-01-08',
      nps_score: 18,
      takeaway: 'Not sure. The venue was too loud to hear clearly.',
      highlight_quote: 'Three people walked out by 8:30. Can\'t remember the last time that happened.',
    },
  ],
}

// ── Speakers with price-privacy story ────────────────────────────────
// Each chapter has a speaker whose negotiated fee is marked private.
// Julie (Regional LC) sees the figure. Peer chapters do not. Demo moment.
export const MOCK_SPEAKERS = [
  {
    id: 'mock-speaker-ismail-phx',
    chapter_id: 'mock-chapter-phoenix',
    name: 'Salim Ismail',
    topic: 'Exponential Organizations',
    actual_fee: 45000,
    fee_private: true,
    notes: 'Negotiated down from $55K by committing to Q1 date.',
  },
  {
    id: 'mock-speaker-guest-den',
    chapter_id: 'mock-chapter-denver',
    name: 'Rachel Steinberg',
    topic: 'Scaling Ops',
    actual_fee: 18000,
    fee_private: false,
    notes: '',
  },
  {
    id: 'mock-speaker-agency-sea',
    chapter_id: 'mock-chapter-seattle',
    name: 'Pacific Northwest Branding',
    topic: 'Branding Workshop',
    actual_fee: 6500,
    fee_private: true,
    notes: 'Local agency, first-time speaker, capped at 6.5K.',
  },
]

// ── Convenience: health-status color classes for use in chapter cards
export const HEALTH_COLOR = {
  healthy: { bg: 'bg-green-50 border-green-200', text: 'text-green-700', badge: 'bg-green-100 text-green-800' },
  mid: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-800' },
  struggling: { bg: 'bg-rose-50 border-rose-200', text: 'text-rose-700', badge: 'bg-rose-100 text-rose-800' },
}
