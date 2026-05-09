#!/usr/bin/env bash
# smoke-test-supabase.sh — verify a Supabase project responds correctly
# for the OurChapter OS app's critical read paths. Used after applying
# migrations to an ephemeral clone or to prod, per
# docs/EPHEMERAL_CLONE_TESTING.md.
#
# Usage:
#   ./scripts/smoke-test-supabase.sh <project-ref> <anon-key>
#
# What this catches: HTTP 5xx / 4xx responses from PostgREST. Those
# typically indicate a broken RLS policy (USING expression throws),
# stale schema cache, missing column referenced by `select=*`, or
# table-doesn't-exist. Exactly the class of failure today's incident
# (2026-05-09) produced — the events policy added in migration 080
# threw during evaluation, returning a 5xx that the app's safeFetch
# logged as a "failed to load" error.
#
# What this does NOT catch: bugs that only manifest under an
# authenticated session (chapter-scoped RLS that lets data leak across
# chapters; auth-dependent policy errors; etc.). Those require a real
# JWT and a future iteration of this script. For now, manual visual
# verification covers it.
#
# Why row-count is NOT asserted: an anon-key request has no auth.uid().
# Most app tables (chapters, profiles, events, saps) gate visibility on
# `user_chapter_id() = chapter_id` or similar, which evaluates to false
# for anonymous callers. So 200-with-zero-rows is the EXPECTED RLS
# response, not a failure. We assert HTTP success only.
#
# Exits 0 if every endpoint returns HTTP 200, non-zero on first non-200.

set -e

REF="${1:?project ref required (e.g. pnrbvaehjbabjckixoxt)}"
ANON_KEY="${2:?anon key required (Project Settings → API → anon key)}"

URL="https://${REF}.supabase.co/rest/v1"

# Endpoints we exercise. Each one: NAME|PATH_AND_QUERY
# Cover the four tables that broke today (events, saps, budget_items,
# contract_checklists) plus the SAP V2 surfaces that were drift-affected.
CHECKS=(
  "chapters|chapters?select=id,name&limit=1"
  "profiles|profiles?select=id&limit=1"
  "events|events?select=id,title&limit=1"
  "saps|saps?select=id,name&limit=1"
  "speakers|speakers?select=id,name&limit=1"
  "budget_items|budget_items?select=id&limit=1"
  "contract_checklists|contract_checklists?select=id&limit=1"
  "sap_member_interest|sap_member_interest?select=id&limit=1"
  "sap_event_engagements|sap_event_engagements?select=id&limit=1"
  "sap_connect_requests|sap_connect_requests?select=id&limit=1"
  "vendors|vendors?select=id&limit=1"
  "venues|venues?select=id&limit=1"
  "speaker_pipeline|speaker_pipeline?select=id&limit=1"
)

PASS=0
FAIL=0

for CHECK in "${CHECKS[@]}"; do
  IFS='|' read -r NAME PATH_AND_QUERY <<< "$CHECK"
  RESPONSE=$(curl -s -w "\n%{http_code}" \
    -H "apikey: ${ANON_KEY}" \
    -H "Authorization: Bearer ${ANON_KEY}" \
    "${URL}/${PATH_AND_QUERY}" 2>&1)
  HTTP_CODE=$(echo "$RESPONSE" | tail -1)
  BODY=$(echo "$RESPONSE" | sed '$d')

  if [ "$HTTP_CODE" != "200" ]; then
    echo "✗ ${NAME}: HTTP ${HTTP_CODE}"
    echo "  Body: ${BODY}" | head -3
    FAIL=$((FAIL + 1))
    continue
  fi

  ROW_COUNT=$(echo "$BODY" | grep -o '"id"' | wc -l | tr -d ' ')
  echo "✓ ${NAME}: HTTP 200, ${ROW_COUNT} row(s) visible to anon"
  PASS=$((PASS + 1))
done

echo ""
echo "Smoke test: ${PASS} passed, ${FAIL} failed"

if [ "$FAIL" -gt 0 ]; then
  echo ""
  echo "FAIL: at least one read path is returning a non-200 from PostgREST."
  echo "Likely causes: broken RLS policy, stale schema cache, missing column, table doesn't exist."
  echo "Investigate before promoting any migration."
  exit 1
fi

echo "All read paths return HTTP 200 (PostgREST + RLS evaluating cleanly)."
