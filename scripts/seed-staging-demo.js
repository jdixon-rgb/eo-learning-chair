#!/usr/bin/env node

/**
 * Staging-only demo seed: creates a fictional "EO Demoland" chapter
 * with five forums, ~35 fictional members, role assignments, agendas,
 * calendar events, parking lot items, a constitution at "proposed"
 * stage, an at-risk entry per forum, and a forum-health assessment.
 *
 * Why this exists: real data on staging belongs to EO Arizona and
 * pulling prod into staging would compromise forum confidentiality.
 * This script gives us realistic-looking fake data to test moderator
 * + forum-health surfaces against, without touching anything real.
 *
 * Hard-pinned to the staging Supabase project. Refuses to run if the
 * URL doesn't contain the staging ref. Re-runs are idempotent: the
 * demo chapter is deleted (cascades wipe child rows) and re-created.
 *
 * Usage:
 *   STAGING_SUPABASE_SERVICE_KEY=<service-role-key> \
 *     node scripts/seed-staging-demo.js
 *
 * The service-role key bypasses RLS so seeds can write across tables
 * the anon key would block. Get it from the Supabase dashboard for
 * the staging project (Settings → API → service_role secret).
 */

import { createClient } from '@supabase/supabase-js'

// ── Hard-pinned to staging ───────────────────────────────────
const STAGING_REF = 'xsktrjbicqsgphuhaahz'
const STAGING_URL = `https://${STAGING_REF}.supabase.co`

const url = process.env.STAGING_SUPABASE_URL || STAGING_URL
const key = process.env.STAGING_SUPABASE_SERVICE_KEY

if (!key) {
  console.error('Missing STAGING_SUPABASE_SERVICE_KEY env var.')
  console.error('Get the service_role secret from the staging Supabase dashboard.')
  process.exit(1)
}

if (!url.includes(STAGING_REF)) {
  console.error(`Refusing to run: target URL ${url} is not the staging project (${STAGING_REF}).`)
  process.exit(1)
}

const sb = createClient(url, key, { auth: { persistSession: false } })

// ── Fixed UUIDs so re-runs produce stable rows ───────────────
const CHAPTER_ID = '11111111-1111-4111-9111-111111111111'

const FY = '2026-2027'
const FY_PREV = '2025-2026'

const FORUM_IDS = {
  aurora:    '22222222-2222-4222-9222-000000000001',
  catalyst:  '22222222-2222-4222-9222-000000000002',
  pinnacle:  '22222222-2222-4222-9222-000000000003',
  riverstone:'22222222-2222-4222-9222-000000000004',
  summit:    '22222222-2222-4222-9222-000000000005',
  heartland: '22222222-2222-4222-9222-000000000006',
  sunbloom:  '22222222-2222-4222-9222-000000000007',
}

// SLP forums — population='slp'. Sized small on purpose: two forums
// covers the "yes, this is its own population" point without bloating
// the demo. Members are SLPs whose linked chapter member is in one of
// the EO forums below; the assignment is by index-pair (Aurora +
// Catalyst SLPs go to Heartland, Pinnacle + Riverstone SLPs go to
// Sunbloom, Summit SLPs stay unassigned to show the empty state).
const SLP_FORUMS = [
  { key: 'heartland', name: 'Heartland SLP Forum', founded: '2018', covers: ['aurora', 'catalyst'] },
  { key: 'sunbloom',  name: 'Sunbloom SLP Forum',  founded: '2020', covers: ['pinnacle', 'riverstone'] },
]

// One SLP per chapter member. Different first names so admins can
// visually separate member from SLP at a glance. Relationship mix is
// realistic — mostly spouse, some partner / fiance.
const SLP_NAMES = [
  { first: 'Cara',     relationship_type: 'spouse' },
  { first: 'Devin',    relationship_type: 'partner' },
  { first: 'Linnea',   relationship_type: 'spouse' },
  { first: 'Mateus',   relationship_type: 'spouse' },
  { first: 'Sofie',    relationship_type: 'spouse' },
  { first: 'Asher',    relationship_type: 'partner' },
  { first: 'Indira',   relationship_type: 'spouse' },
  { first: 'Esme',     relationship_type: 'spouse' },
  { first: 'Bram',     relationship_type: 'spouse' },
  { first: 'Tessa',    relationship_type: 'fiance' },
  { first: 'Konrad',   relationship_type: 'spouse' },
  { first: 'Liesel',   relationship_type: 'spouse' },
  { first: 'Wells',    relationship_type: 'spouse' },
  { first: 'Anjali',   relationship_type: 'partner' },
  { first: 'Padraic',  relationship_type: 'spouse' },
  { first: 'Galen',    relationship_type: 'spouse' },
  { first: 'Senna',    relationship_type: 'spouse' },
  { first: 'Iris',     relationship_type: 'spouse' },
  { first: 'Owen',     relationship_type: 'spouse' },
  { first: 'Pia',      relationship_type: 'spouse' },
  { first: 'Vesper',   relationship_type: 'partner' },
  { first: 'Hollis',   relationship_type: 'spouse' },
  { first: 'Auden',    relationship_type: 'spouse' },
  { first: 'Mira',     relationship_type: 'spouse' },
  { first: 'Calder',   relationship_type: 'partner' },
  { first: 'Saskia',   relationship_type: 'spouse' },
  { first: 'Beckett',  relationship_type: 'spouse' },
  { first: 'Juno',     relationship_type: 'spouse' },
  { first: 'Tariq',    relationship_type: 'spouse' },
  { first: 'Larkin',   relationship_type: 'fiance' },
  { first: 'Ronan',    relationship_type: 'spouse' },
  { first: 'Yara',     relationship_type: 'spouse' },
  { first: 'Quinn',    relationship_type: 'partner' },
  { first: 'Wynn',     relationship_type: 'spouse' },
  { first: 'Ada',      relationship_type: 'spouse' },
]

// Member layout per forum: 7 members, one per role.
// Fully fictional names — no resemblance to real people intended.
const FORUMS = [
  {
    key: 'aurora', name: 'Aurora Forum', founded: '2014',
    members: [
      { first: 'Tomás',  last: 'Ortega',     industry: 'Logistics',     role: 'moderator' },
      { first: 'Priya',  last: 'Bellrose',   industry: 'Healthcare',    role: 'moderator_elect' },
      { first: 'Drew',   last: 'Hampton',    industry: 'Construction',  role: 'moderator_elect_elect' },
      { first: 'Joaquim',last: 'Fairview',   industry: 'Manufacturing', role: 'timer' },
      { first: 'Naya',   last: 'Cordwell',   industry: 'Hospitality',   role: 'retreat_planner' },
      { first: 'Ben',    last: 'Halloran',   industry: 'Real Estate',   role: 'social' },
      { first: 'Imani',  last: 'Shorewood',  industry: 'Tech / SaaS',   role: 'technology' },
    ],
  },
  {
    key: 'catalyst', name: 'Catalyst Forum', founded: '2017',
    members: [
      { first: 'Marisol',last: 'Vance',       industry: 'Marketing Agency', role: 'moderator' },
      { first: 'Reuben', last: 'Tindale',     industry: 'Legal',            role: 'moderator_elect' },
      { first: 'Sasha',  last: 'Ironwood',    industry: 'Consulting',       role: 'moderator_elect_elect' },
      { first: 'Linus',  last: 'Petrakis',    industry: 'Food & Beverage',  role: 'timer' },
      { first: 'Adaeze', last: 'Mountainview',industry: 'Education',        role: 'retreat_planner' },
      { first: 'Wren',   last: 'Caldwell',    industry: 'Wellness / Spa',   role: 'social' },
      { first: 'Otis',   last: 'Brightwell',  industry: 'IT Services',      role: 'technology' },
    ],
  },
  {
    key: 'pinnacle', name: 'Pinnacle Forum', founded: '2009',
    members: [
      { first: 'Eleni',  last: 'Hawthorne', industry: 'Architecture',      role: 'moderator' },
      { first: 'Cyrus',  last: 'Loftus',    industry: 'Financial Services',role: 'moderator_elect' },
      { first: 'Nadia',  last: 'Waycross',  industry: 'Insurance',         role: 'moderator_elect_elect' },
      { first: 'Bram',   last: 'Eastwick',  industry: 'Aviation',          role: 'timer' },
      { first: 'Lior',   last: 'Quintrell', industry: 'Recruiting',        role: 'retreat_planner' },
      { first: 'Maeve',  last: 'Sorenson',  industry: 'Apparel / Retail',  role: 'social' },
      { first: 'Theo',   last: 'Vandermark',industry: 'Cybersecurity',     role: 'technology' },
    ],
  },
  {
    key: 'riverstone', name: 'Riverstone Forum', founded: '2021',
    members: [
      { first: 'Anneka', last: 'Pemberton', industry: 'Biotech',           role: 'moderator' },
      { first: 'Hassan', last: 'Drummond',  industry: 'Engineering Firm', role: 'moderator_elect' },
      { first: 'Kira',   last: 'Lindenway', industry: 'PR / Comms',        role: 'moderator_elect_elect' },
      { first: 'Roan',   last: 'Tessler',   industry: 'Auto / Dealership',role: 'timer' },
      { first: 'Yuki',   last: 'Brookline', industry: 'Fitness',           role: 'retreat_planner' },
      { first: 'Sage',   last: 'Holcomb',   industry: 'Nonprofit',         role: 'social' },
      { first: 'Dario',  last: 'Westbridge',industry: 'Cloud Infra',       role: 'technology' },
    ],
  },
  {
    key: 'summit', name: 'Summit Forum', founded: '2005',
    members: [
      { first: 'Helena', last: 'Marwood',   industry: 'Private Equity',    role: 'moderator' },
      { first: 'Kofi',   last: 'Brennan',   industry: 'Energy',            role: 'moderator_elect' },
      { first: 'Inara',  last: 'Stoneleigh',industry: 'Pharma',            role: 'moderator_elect_elect' },
      { first: 'Marek',  last: 'Yardley',   industry: 'Distribution',      role: 'timer' },
      { first: 'Talia',  last: 'Crestmont', industry: 'Events / Catering', role: 'retreat_planner' },
      { first: 'Arlo',   last: 'Penwhistle',industry: 'Gaming Studio',     role: 'social' },
      { first: 'Selene', last: 'Ridgeway',  industry: 'AI / ML',           role: 'technology' },
    ],
  },
]

// Per-forum demo content templates ────────────────────────────
const PARKING_LOT_PER_FORUM = [
  { name: 'Should we move the September retreat to a different venue?', importance: 7, urgency: 4 },
  { name: 'Discuss bringing in a couples-and-business expert for a meeting', importance: 6, urgency: 3 },
  { name: 'Revisit our cell-phone-during-meetings norm', importance: 5, urgency: 6 },
  { name: 'New member pre-meeting onboarding ritual', importance: 8, urgency: 5 },
  { name: 'Annual summit attendance — who is going?', importance: 4, urgency: 7 },
  { name: 'Vacation policy sharing — comparing notes across companies', importance: 5, urgency: 2 },
]

const AGENDA_ITEMS_TEMPLATE = [
  { title: 'Forum Opening & Connect', minutes: 20, sort_order: 1, description: 'Highs/lows, anything to declare.' },
  { title: 'Education Component',     minutes: 45, sort_order: 2, description: 'Member-led on a topic from last month.' },
  { title: 'Member Presentation',     minutes: 60, sort_order: 3, description: '5-13-5 format, business + personal.' },
  { title: 'Break',                   minutes: 15, sort_order: 4, description: '' },
  { title: 'Member Presentation 2',   minutes: 60, sort_order: 5, description: '5-13-5 format.' },
  { title: 'Forum Closing & Action',  minutes: 20, sort_order: 6, description: 'Commitments + parking lot triage.' },
]

// SAP partners — company-level records. `popularity` is the target
// number of EO Demoland members (out of 35) who declare interest, so
// the moderator's collective view shows obvious leaders (Lighthouse
// Coaching, Crestline Wealth) and obvious long-tail (Spire Marketing,
// Verdant Health). The distribution is deterministic: members are
// included in interest sets by index so re-runs produce stable data.
const SAP_PARTNERS = [
  { key: 'lighthouse',  name: 'Lighthouse Executive Coaching', industry: 'Executive Coaching', tier: 'gold',     popularity: 26, contact: { name: 'Adrienne Hollis',  role: 'Senior Coach' } },
  { key: 'crestline',   name: 'Crestline Wealth Partners',     industry: 'Financial Services', tier: 'platinum', popularity: 24, contact: { name: 'Marcus Holloway',  role: 'Managing Director' } },
  { key: 'atlas',       name: 'Atlas Commercial Real Estate',  industry: 'Real Estate',        tier: 'platinum', popularity: 22, contact: { name: 'Genevieve Park',   role: 'Principal Broker' } },
  { key: 'granite',     name: 'Granite Tech Advisors',         industry: 'IT Services',        tier: 'gold',     popularity: 16, contact: { name: 'Devon Ashbury',    role: 'CTO Advisor' } },
  { key: 'northwind',   name: 'Northwind Insurance Group',     industry: 'Insurance',          tier: 'gold',     popularity: 14, contact: { name: 'Renata Cosgrove',  role: 'VP, Commercial' } },
  { key: 'beaconlight', name: 'Beaconlight Legal',             industry: 'Legal',              tier: 'gold',     popularity: 12, contact: { name: 'Theo Pemberton',   role: 'Founding Partner' } },
  { key: 'verdant',     name: 'Verdant Health & Wellness',     industry: 'Healthcare',         tier: 'silver',   popularity: 10, contact: { name: 'Dr. Imani Cole',   role: 'Medical Director' } },
  { key: 'spire',       name: 'Spire Marketing Studio',        industry: 'Marketing',          tier: 'silver',   popularity: 8,  contact: { name: 'Quinlan Tate',     role: 'Creative Director' } },
]

const CONSTITUTION_SECTIONS = [
  { id: 'sec-1', title: 'Confidentiality',   body: 'What is shared in forum stays in forum, with no exceptions outside the formal escalation paths.' },
  { id: 'sec-2', title: 'Attendance',        body: 'Members commit to 90% attendance. Two missed meetings without notice triggers a check-in.' },
  { id: 'sec-3', title: 'Presentation Norms', body: '5-13-5 format. Personal first, business second. Experience-share, not advice.' },
  { id: 'sec-4', title: 'Cell Phones',       body: 'Phones face-down on the table. Step out for emergencies; do not respond from the chair.' },
  { id: 'sec-5', title: 'Annual Retreat',    body: 'One overnight retreat per fiscal year. Cost shared equally. Spouses invited to a designated portion.' },
]

// ── Helpers ──────────────────────────────────────────────────
function ymd(date) { return date.toISOString().slice(0, 10) }
function addDays(date, n) { const d = new Date(date); d.setDate(d.getDate() + n); return d }

function uuidFor(prefix, key) {
  // Deterministic-ish pseudo-UUIDs from prefix + key. Not real v4
  // UUIDs but structurally valid. Stable across re-runs.
  const hash = [...key].reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0)
  const hex = (Math.abs(hash) >>> 0).toString(16).padStart(8, '0')
  return `${prefix}-${hex.slice(0, 4)}-4${hex.slice(4, 7)}-9${hex.slice(0, 3)}-${hex}${hex.slice(0, 4)}`
}

async function step(label, fn) {
  process.stdout.write(`  ${label}… `)
  const t = Date.now()
  try {
    const result = await fn()
    console.log(`ok (${Date.now() - t}ms)`)
    return result
  } catch (e) {
    console.log('FAIL')
    console.error(e)
    process.exit(1)
  }
}

function check({ error }, label) {
  if (error) {
    console.error(`\nError on ${label}:`, error.message || error)
    throw error
  }
}

// ── Main ─────────────────────────────────────────────────────
async function main() {
  console.log(`Seeding demo chapter into ${url}\n`)

  await step('Wipe existing demo chapter (cascades)', async () => {
    const r = await sb.from('chapters').delete().eq('id', CHAPTER_ID)
    check(r, 'delete chapters')
  })

  await step('Insert chapter (EO Demoland)', async () => {
    const r = await sb.from('chapters').insert({
      id: CHAPTER_ID,
      name: 'EO Demoland',
      fiscal_year_start: 8,
      total_budget: 250000,
      president_theme: 'Forge the Future',
      president_name: 'Daria Whitfield',
      currency: 'USD',
      timezone: 'America/Phoenix',
      region: 'Demo',
    })
    check(r, 'insert chapter')
  })

  // Member rows: one per (forum × role). Email is forum-key based so
  // staging can sign in via admin Generate Sign-In Link if desired.
  const memberRows = []
  const memberByForumAndRole = {}
  for (const forum of FORUMS) {
    memberByForumAndRole[forum.key] = {}
    for (const m of forum.members) {
      const id = uuidFor('33333333', `${forum.key}:${m.role}`)
      const email = `${m.first.toLowerCase().replace(/[^a-z]/g, '')}.${m.last.toLowerCase().replace(/[^a-z]/g, '')}@demoland.example`
      memberRows.push({
        id,
        chapter_id: CHAPTER_ID,
        name: `${m.first} ${m.last}`,
        first_name: m.first,
        last_name: m.last,
        email,
        forum: forum.name,
        industry: m.industry,
        status: 'active',
      })
      memberByForumAndRole[forum.key][m.role] = id
    }
  }

  await step(`Insert ${memberRows.length} members`, async () => {
    const r = await sb.from('chapter_members').insert(memberRows)
    check(r, 'insert chapter_members')
  })

  await step(`Insert ${FORUMS.length} forums`, async () => {
    const rows = FORUMS.map(f => ({
      id: FORUM_IDS[f.key],
      chapter_id: CHAPTER_ID,
      name: f.name,
      meeting_cadence: 'monthly',
      member_count: f.members.length,
      health_score: 7,
      is_active: true,
      founded_year: f.founded,
      moderator_name: `${f.members[0].first} ${f.members[0].last}`,
      moderator_email: `${f.members[0].first.toLowerCase()}.${f.members[0].last.toLowerCase()}@demoland.example`,
      population: 'member',
    }))
    const r = await sb.from('forums').insert(rows)
    check(r, 'insert forums')
  })

  await step(`Insert ${SLP_FORUMS.length} SLP forums`, async () => {
    const rows = SLP_FORUMS.map(f => ({
      id: FORUM_IDS[f.key],
      chapter_id: CHAPTER_ID,
      name: f.name,
      meeting_cadence: 'monthly',
      member_count: 0,
      health_score: 7,
      is_active: true,
      founded_year: f.founded,
      moderator_name: '',
      moderator_email: '',
      population: 'slp',
    }))
    const r = await sb.from('forums').insert(rows)
    check(r, 'insert SLP forums')
  })

  // SLPs — one per member. Email left blank for most rows (the
  // realistic state for a chapter that hasn't invited SLPs yet).
  // A few rows get an email + invite_status='pending' to demo the
  // "invited but hasn't claimed login" state.
  await step('Insert SLPs (one per member)', async () => {
    // forum.key -> slp_forum.name lookup. Members whose forum isn't
    // covered get an empty forum field (unassigned).
    const forumAssignment = {}
    for (const slpForum of SLP_FORUMS) {
      for (const coverKey of slpForum.covers) {
        forumAssignment[coverKey] = slpForum.name
      }
    }

    const slpRows = []
    let nameIdx = 0
    for (const forum of FORUMS) {
      for (const m of forum.members) {
        const slpName = SLP_NAMES[nameIdx % SLP_NAMES.length]
        nameIdx += 1
        const memberId = memberByForumAndRole[forum.key][m.role]
        // Invite a handful of SLPs to demo the status flow.
        const inviteThisOne = nameIdx % 9 === 0
        slpRows.push({
          chapter_id: CHAPTER_ID,
          member_id: memberId,
          name: `${slpName.first} ${m.last}`,
          relationship_type: slpName.relationship_type,
          forum: forumAssignment[forum.key] || '',
          email: inviteThisOne
            ? `${slpName.first.toLowerCase()}.${m.last.toLowerCase()}@demoland.example`
            : null,
          invite_status: inviteThisOne ? 'pending' : 'not_invited',
          invited_at: inviteThisOne ? new Date().toISOString() : null,
        })
      }
    }
    const r = await sb.from('slps').insert(slpRows)
    check(r, 'insert slps')
  })

  // SAP partners + their primary contacts. Member interest below
  // depends on these IDs, so insert order matters.
  await step(`Insert ${SAP_PARTNERS.length} SAP partners`, async () => {
    const rows = SAP_PARTNERS.map(p => ({
      id: uuidFor('77777777', `sap:${p.key}`),
      chapter_id: CHAPTER_ID,
      name: p.name,
      industry: p.industry,
      tier: p.tier,
      status: 'active',
      website: `https://${p.key}.demoland.example`,
      description: `${p.industry} partner serving EO Demoland members.`,
    }))
    const r = await sb.from('saps').insert(rows)
    check(r, 'insert saps')
  })

  await step('Insert SAP contacts (primary per partner)', async () => {
    const rows = SAP_PARTNERS.map(p => ({
      sap_id: uuidFor('77777777', `sap:${p.key}`),
      name: p.contact.name,
      role: p.contact.role,
      email: `${p.contact.name.toLowerCase().replace(/[^a-z]/g, '.')}@${p.key}.demoland.example`,
      is_primary: true,
    }))
    const r = await sb.from('sap_contacts').insert(rows)
    check(r, 'insert sap_contacts')
  })

  // SAP forum interest — deterministic spread so the moderator's
  // "who in my forum wants to spend time with which SAP" view shows
  // a clear popularity gradient. Each SAP's `popularity` (target
  // member count out of 35) picks members by index, rotating the
  // start offset by SAP so different forums see different leaders.
  // The table is forum-scoped: rows are keyed by (sap_id,
  // chapter_member_id) and forum_id comes from the member's forum.
  await step('Insert SAP forum interest (deterministic spread)', async () => {
    const memberById = new Map(memberRows.map(m => [m.id, m]))
    // forum.name → forum_id lookup
    const forumIdByName = new Map(FORUMS.map(f => [f.name, FORUM_IDS[f.key]]))
    const memberIds = memberRows.map(m => m.id)
    const rows = []
    SAP_PARTNERS.forEach((p, sapIdx) => {
      const sapId = uuidFor('77777777', `sap:${p.key}`)
      const offset = (sapIdx * 5) % memberIds.length
      for (let i = 0; i < p.popularity; i++) {
        const memberId = memberIds[(offset + i) % memberIds.length]
        const member = memberById.get(memberId)
        rows.push({
          chapter_id: CHAPTER_ID,
          sap_id: sapId,
          chapter_member_id: memberId,
          forum_id: forumIdByName.get(member.forum),
          interested: true,
        })
      }
    })
    // De-dupe by (sap_id, chapter_member_id) — modulo wrap-around at
    // high popularity would otherwise violate the unique constraint.
    const seen = new Set()
    const dedup = rows.filter(r => {
      const k = `${r.sap_id}:${r.chapter_member_id}`
      if (seen.has(k)) return false
      seen.add(k)
      return true
    })
    const r = await sb.from('sap_forum_interest').insert(dedup)
    check(r, 'insert sap_forum_interest')
  })

  await step('Insert role assignments (current + previous FY)', async () => {
    const rows = []
    for (const forum of FORUMS) {
      for (const m of forum.members) {
        rows.push({
          chapter_id: CHAPTER_ID,
          forum_id: FORUM_IDS[forum.key],
          chapter_member_id: memberByForumAndRole[forum.key][m.role],
          role: m.role,
          fiscal_year: FY,
        })
      }
      // Last FY history: the moderator pipeline rotates forward each
      // year — this year's moderator was last year's moderator_elect,
      // this year's elect was last year's elect_elect. This year's
      // elect_elect is new to the pipeline, so they get no last-FY
      // row. Non-pipeline roles (timer / retreat_planner / social /
      // technology) are simplified as "held the same role last year"
      // — turnover happens in real life but this is enough texture
      // for a demo. Unique constraint is (forum_id, role, fy), so
      // every (forum, role) tuple appears at most once per FY here.
      const PREV_ROLE = { moderator: 'moderator_elect', moderator_elect: 'moderator_elect_elect' }
      for (const m of forum.members) {
        if (m.role === 'moderator_elect_elect') continue
        const prevRole = PREV_ROLE[m.role] || m.role
        rows.push({
          chapter_id: CHAPTER_ID,
          forum_id: FORUM_IDS[forum.key],
          chapter_member_id: memberByForumAndRole[forum.key][m.role],
          role: prevRole,
          fiscal_year: FY_PREV,
        })
      }
    }
    const r = await sb.from('forum_role_assignments').insert(rows)
    check(r, 'insert forum_role_assignments')
  })

  await step('Insert agendas (2 per forum: published + draft) with items', async () => {
    const today = new Date()
    for (const forum of FORUMS) {
      const modId = memberByForumAndRole[forum.key].moderator
      // Published agenda — meeting in 10 days
      const publishedId = uuidFor('44444444', `${forum.key}:published`)
      const r1 = await sb.from('forum_agendas').insert({
        id: publishedId,
        chapter_id: CHAPTER_ID,
        forum_id: FORUM_IDS[forum.key],
        title: 'Monthly Meeting',
        meeting_date: ymd(addDays(today, 10)),
        start_time: '12:00 PM',
        end_time: '4:30 PM',
        location: `${forum.members[5].first}'s office`,
        host: `${forum.members[5].first} ${forum.members[5].last}`,
        mission: 'Help each other become better entrepreneurs and people.',
        forum_values: 'Confidentiality. Vulnerability. Experience-share over advice.',
        target_minutes: 270,
        status: 'published',
        created_by: null,
      })
      check(r1, 'insert forum_agenda (published)')
      const items1 = AGENDA_ITEMS_TEMPLATE.map(it => ({ ...it, agenda_id: publishedId }))
      check(await sb.from('forum_agenda_items').insert(items1), 'insert forum_agenda_items (published)')

      // Draft agenda — meeting in 40 days
      const draftId = uuidFor('44444444', `${forum.key}:draft`)
      const r2 = await sb.from('forum_agendas').insert({
        id: draftId,
        chapter_id: CHAPTER_ID,
        forum_id: FORUM_IDS[forum.key],
        title: 'Monthly Meeting (next)',
        meeting_date: ymd(addDays(today, 40)),
        start_time: '12:00 PM',
        end_time: '4:30 PM',
        location: 'TBD',
        host: 'TBD',
        target_minutes: 270,
        status: 'draft',
        created_by: null,
      })
      check(r2, 'insert forum_agenda (draft)')
      const items2 = AGENDA_ITEMS_TEMPLATE.slice(0, 4).map(it => ({ ...it, agenda_id: draftId }))
      check(await sb.from('forum_agenda_items').insert(items2), 'insert forum_agenda_items (draft)')
    }
  })

  await step('Insert calendar events (5 per forum, mixed types)', async () => {
    const today = new Date()
    const rows = []
    for (const forum of FORUMS) {
      const fid = FORUM_IDS[forum.key]
      rows.push(
        { chapter_id: CHAPTER_ID, forum_id: fid, fiscal_year: FY, title: 'Monthly Meeting',     event_date: ymd(addDays(today, 10)),  event_type: 'meeting',  location: `${forum.members[5].first}'s office` },
        { chapter_id: CHAPTER_ID, forum_id: fid, fiscal_year: FY, title: 'Annual Retreat',      event_date: ymd(addDays(today, 60)),  event_type: 'retreat',  location: 'Sedona, AZ' },
        { chapter_id: CHAPTER_ID, forum_id: fid, fiscal_year: FY, title: 'SAP Visit — Demo Wealth Partners', event_date: ymd(addDays(today, 22)), event_type: 'sap_visit', location: 'SAP HQ' },
        { chapter_id: CHAPTER_ID, forum_id: fid, fiscal_year: FY, title: 'Holiday Social',      event_date: ymd(addDays(today, 75)),  event_type: 'social',   location: `${forum.members[5].first}'s home` },
        { chapter_id: CHAPTER_ID, forum_id: fid, fiscal_year: FY, title: 'Monthly Meeting',     event_date: ymd(addDays(today, 40)),  event_type: 'meeting',  location: 'TBD' },
      )
    }
    const r = await sb.from('forum_calendar_events').insert(rows)
    check(r, 'insert forum_calendar_events')
  })

  await step('Insert parking lot entries (6 per forum)', async () => {
    const rows = []
    for (const forum of FORUMS) {
      for (const item of PARKING_LOT_PER_FORUM) {
        rows.push({
          chapter_id: CHAPTER_ID,
          forum: forum.name,
          author_member_id: memberByForumAndRole[forum.key].moderator,
          name: item.name,
          importance: item.importance,
          urgency: item.urgency,
        })
      }
    }
    const r = await sb.from('parking_lot_entries').insert(rows)
    check(r, 'insert parking_lot_entries')
  })

  await step('Insert constitution + proposed version per forum', async () => {
    for (const forum of FORUMS) {
      const constId = uuidFor('55555555', `${forum.key}:const`)
      check(await sb.from('forum_constitutions').insert({
        id: constId,
        chapter_id: CHAPTER_ID,
        forum_id: FORUM_IDS[forum.key],
      }), 'insert forum_constitutions')

      // v1 adopted last FY
      check(await sb.from('forum_constitution_versions').insert({
        id: uuidFor('66666666', `${forum.key}:v1`),
        constitution_id: constId,
        chapter_id: CHAPTER_ID,
        version_number: 1,
        status: 'adopted',
        title: `${forum.name} Constitution`,
        preamble: `We, the members of ${forum.name}, commit to one another in pursuit of personal and professional growth.`,
        sections: CONSTITUTION_SECTIONS.slice(0, 4),
        adopted_at: new Date(Date.now() - 365 * 24 * 3600 * 1000).toISOString(),
      }), 'insert forum_constitution_versions v1')

      // v2 proposed (with all 5 sections — gives clause-review surface
      // something to chew on)
      check(await sb.from('forum_constitution_versions').insert({
        id: uuidFor('66666666', `${forum.key}:v2`),
        constitution_id: constId,
        chapter_id: CHAPTER_ID,
        version_number: 2,
        status: 'proposed',
        title: `${forum.name} Constitution`,
        preamble: `We, the members of ${forum.name}, commit to one another in pursuit of personal and professional growth.`,
        sections: CONSTITUTION_SECTIONS,
        proposed_at: new Date().toISOString(),
      }), 'insert forum_constitution_versions v2')
    }
  })

  await step('Insert at-risk entries (one per forum, varied)', async () => {
    const RISK_LEVELS = ['low', 'medium', 'high', 'medium', 'low']
    const REASONS = [
      ['attendance', 'engagement'],
      ['confidentiality_concern', 'tone'],
      ['life_event', 'attendance'],
      ['better_fit_elsewhere'],
      ['business_phase'],
    ]
    const rows = FORUMS.map((forum, i) => ({
      chapter_id: CHAPTER_ID,
      forum_id: FORUM_IDS[forum.key],
      // Pick the "social" role-holder as the at-risk member (arbitrary)
      chapter_member_id: memberByForumAndRole[forum.key].social,
      risk_level: RISK_LEVELS[i],
      reasons: REASONS[i],
      notes: 'Logged during the last health check. Watch for the next two meetings.',
      better_fit_note: i === 3 ? `Might thrive in a more early-stage forum.` : '',
      recommended_action: i === 1 ? 'coach' : 'watch',
      status: 'open',
      created_by: memberByForumAndRole[forum.key].moderator,
    }))
    const r = await sb.from('forum_at_risk_entries').insert(rows)
    check(r, 'insert forum_at_risk_entries')
  })

  await step('Insert health assessments (current FY, one per forum)', async () => {
    const STAGES = ['forming', 'storming', 'norming', 'performing', 'performing']
    const rows = FORUMS.map((forum, i) => ({
      chapter_id: CHAPTER_ID,
      forum_id: FORUM_IDS[forum.key],
      fiscal_year: FY,
      lifecycle_stage: STAGES[i],
      lifecycle_note: '',
      constitution_reviewed: i !== 0,
      one_pager_complete: i > 1,
      roles_assigned: true,
      chair_notes: 'Forum is healthy overall. Monitor presentation prep quality.',
      handoff_narrative: 'Incoming chair: this forum has done two seedings in the last 18 months. New members are still settling in.',
    }))
    const r = await sb.from('forum_health_assessments').insert(rows)
    check(r, 'insert forum_health_assessments')
  })

  console.log('\nDone. Demo chapter ready:')
  console.log(`  Chapter:    EO Demoland (${CHAPTER_ID})`)
  console.log(`  Forums:     ${FORUMS.length} (member) + ${SLP_FORUMS.length} (SLP)`)
  console.log(`  Members:    ${memberRows.length}`)
  console.log(`  SLPs:       ${memberRows.length} (one per member)`)
  console.log('\nSwitch into "EO Demoland" via the super-admin chapter selector to test.')
}

main().catch(err => {
  console.error('\nSeed failed:', err)
  process.exit(1)
})
