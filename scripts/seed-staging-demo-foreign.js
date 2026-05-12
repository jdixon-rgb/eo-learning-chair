#!/usr/bin/env node

/**
 * Staging-only demo seed: creates a fictional "EO Demoland-Foreign"
 * chapter with currency=CNY so we can visually verify that money
 * displays everywhere (Speakers, Venues, Events, Budget, Scenarios,
 * Library, President Dashboard, Past SAPs, Settings, and the
 * send-payment-package email) respect the chapter currency rather
 * than falling back to USD.
 *
 * Companion to seed-staging-demo.js. Distinct chapter ID so re-runs
 * don't collide with the EO Demoland seed. Populates only the surfaces
 * needed for currency testing — no forums, members, or constitution.
 *
 * Hard-pinned to the staging Supabase project. Re-runs are idempotent:
 * the demo chapter is deleted (cascades wipe child rows) and re-created.
 *
 * Usage:
 *   STAGING_SUPABASE_SERVICE_KEY=<service-role-key> \
 *     node scripts/seed-staging-demo-foreign.js
 */

import { createClient } from '@supabase/supabase-js'

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

// Fixed UUIDs — re-runs land on the same rows.
const CHAPTER_ID = '99999999-9999-4999-9999-999999999999'
const FY = '2025-2026'

const SPEAKERS = [
  { name: 'Mei-Ling Tan',     topic: 'Scaling across Asia',         low: 80000,  high: 120000, est: 95000,  actual: null,   fitScore: 9, stage: 'researching', deposit: null,  final: null  },
  { name: 'Hiroshi Nakamura', topic: 'Lean operations from Japan',  low: 60000,  high: 90000,  est: 75000,  actual: 72000,  fitScore: 8, stage: 'contracted',  deposit: 30000, final: 42000 },
  { name: 'Priya Iyer',       topic: 'Founder resilience',          low: 100000, high: 150000, est: 125000, actual: null,   fitScore: 10, stage: 'negotiating', deposit: null,  final: null  },
  { name: 'Anjali Rao',       topic: 'Family business succession',  low: 50000,  high: 80000,  est: 65000,  actual: 65000,  fitScore: 7, stage: 'confirmed',   deposit: 25000, final: 40000 },
  { name: 'Liu Wei',          topic: 'Manufacturing transformation', low: 90000,  high: 140000, est: 115000, actual: null,   fitScore: 8, stage: 'outreach',    deposit: null,  final: null  },
]

const VENUES = [
  { name: 'Bund Conference Centre',    type: 'hotel',      capacity: 200, rental: 45000, av: 12000, fb: 35000, stage: 'confirmed'     },
  { name: 'Pudong Museum Hall',        type: 'museum',     capacity: 150, rental: 65000, av: 18000, fb: 28000, stage: 'site_visit'    },
  { name: 'West Bund Riverside Estate', type: 'private',    capacity: 80,  rental: 30000, av: 8000,  fb: 22000, stage: 'quote_requested'},
]

const EVENTS = [
  { title: 'Founder Resilience Keynote',     month: 0, type: 'traditional',     format: 'keynote',      budget: { speaker_fee: 95000, food_beverage: 30000, venue_rental: 45000, av_production: 12000 } },
  { title: 'Lean Ops Workshop',              month: 2, type: 'traditional',     format: 'workshop_4hr', budget: { speaker_fee: 75000, food_beverage: 25000, venue_rental: 30000, av_production: 8000  } },
  { title: 'Manufacturing Tour & Dinner',    month: 5, type: 'experiential',    format: 'tour',         budget: { speaker_fee: 115000, food_beverage: 40000, venue_rental: 65000, travel: 15000 } },
]

const SAPS = [
  { name: 'Yangtze Capital Partners', company: 'Yangtze Capital',  tier: 'platinum', industry: 'Investment Banking / M&A', annual: 250000, contribution: 'sponsorship' },
  { name: 'Shanghai Tech Logistics',  company: 'STL Group',        tier: 'gold',     industry: 'Logistics / Supply Chain', annual: 150000, contribution: 'sponsorship' },
]

function uuid(prefix, key) {
  const hash = [...key].reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0)
  const hex = (Math.abs(hash) >>> 0).toString(16).padStart(8, '0')
  return `${prefix}-${hex.slice(0, 4)}-4${hex.slice(4, 7)}-9${hex.slice(0, 3)}-${hex}${hex.slice(0, 4)}`
}

async function step(label, fn) {
  process.stdout.write(`  ${label}… `)
  const t = Date.now()
  try {
    await fn()
    console.log(`ok (${Date.now() - t}ms)`)
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

async function main() {
  console.log(`Seeding EO Demoland-Foreign (CNY) into ${url}\n`)

  await step('Wipe existing rows (cascades)', async () => {
    const r = await sb.from('chapters').delete().eq('id', CHAPTER_ID)
    check(r, 'delete chapters')
  })

  await step('Insert chapter (EO Demoland-Foreign, CNY)', async () => {
    const r = await sb.from('chapters').insert({
      id: CHAPTER_ID,
      name: 'EO Demoland-Foreign',
      fiscal_year_start: 8,
      total_budget: 2000000,
      president_theme: 'Bridge East and West',
      president_name: 'Wei Zhang',
      currency: 'CNY',
      timezone: 'Asia/Shanghai',
      region: 'Demo',
    })
    check(r, 'insert chapter')
  })

  const speakerIdByName = {}
  await step(`Insert ${SPEAKERS.length} speakers`, async () => {
    const rows = SPEAKERS.map(s => {
      const id = uuid('aaaaaaaa', s.name)
      speakerIdByName[s.name] = id
      return {
        id, chapter_id: CHAPTER_ID, name: s.name, topic: s.topic,
        fee_range_low: s.low, fee_range_high: s.high,
        fee_estimated: s.est, fee_actual: s.actual,
        fit_score: s.fitScore, pipeline_stage: s.stage,
        contact_method: 'direct', share_scope: 'chapter_only',
      }
    })
    const r = await sb.from('speakers').insert(rows)
    check(r, 'insert speakers')
  })

  await step(`Insert ${SPEAKERS.length} speaker_pipeline entries`, async () => {
    const rows = SPEAKERS.map(s => ({
      id: uuid('bbbbbbbb', s.name),
      speaker_id: speakerIdByName[s.name],
      chapter_id: CHAPTER_ID, fiscal_year: FY, pipeline_stage: s.stage,
      fit_score: s.fitScore, fee_estimated: s.est, fee_actual: s.actual,
      deposit_amount: s.deposit, final_payment_amount: s.final,
      payment_terms_notes: '',
    }))
    const r = await sb.from('speaker_pipeline').insert(rows)
    check(r, 'insert speaker_pipeline')
  })

  const venueIdByName = {}
  await step(`Insert ${VENUES.length} venues`, async () => {
    const rows = VENUES.map(v => {
      const id = uuid('cccccccc', v.name)
      venueIdByName[v.name] = id
      return {
        id, chapter_id: CHAPTER_ID, name: v.name,
        venue_type: v.type, capacity: v.capacity,
        base_rental_cost: v.rental, av_cost_estimate: v.av,
        fb_estimated_cost: v.fb, av_quality: 'good',
        pipeline_stage: v.stage, staff_rating: 4,
      }
    })
    const r = await sb.from('venues').insert(rows)
    check(r, 'insert venues')
  })

  const eventIds = []
  await step(`Insert ${EVENTS.length} events`, async () => {
    const rows = EVENTS.map(e => {
      const id = uuid('dddddddd', e.title)
      eventIds.push({ id, title: e.title, budget: e.budget })
      return {
        id, chapter_id: CHAPTER_ID, title: e.title,
        month_index: e.month, event_type: e.type, event_format: e.format,
        fiscal_year: FY, status: 'planning',
      }
    })
    const r = await sb.from('events').insert(rows)
    check(r, 'insert events')
  })

  await step('Insert budget_items for each event', async () => {
    const rows = []
    for (const ev of eventIds) {
      for (const [category, amount] of Object.entries(ev.budget)) {
        rows.push({
          id: uuid('eeeeeeee', `${ev.id}:${category}`),
          event_id: ev.id, category, budget_amount: amount,
          contracted_amount: 0,
        })
      }
    }
    const r = await sb.from('budget_items').insert(rows)
    check(r, 'insert budget_items')
  })

  await step(`Insert ${SAPS.length} SAP partners`, async () => {
    const rows = SAPS.map(s => ({
      id: uuid('ffffffff', s.name),
      chapter_id: CHAPTER_ID, name: s.name, company: s.company,
      tier: s.tier, industry: s.industry, status: 'active',
      annual_sponsorship: s.annual, contribution_type: s.contribution,
    }))
    const r = await sb.from('saps').insert(rows)
    check(r, 'insert saps')
  })

  console.log('\n✓ EO Demoland-Foreign seeded.')
  console.log(`  Chapter:  EO Demoland-Foreign (${CHAPTER_ID})`)
  console.log(`  Currency: CNY · Timezone: Asia/Shanghai`)
  console.log(`  ${SPEAKERS.length} speakers · ${VENUES.length} venues · ${EVENTS.length} events · ${SAPS.length} SAPs`)
  console.log('\nSwitch into "EO Demoland-Foreign" via the super-admin chapter selector to verify currency rendering.')
}

main()
