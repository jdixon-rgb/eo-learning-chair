#!/usr/bin/env bash
# smoke-test-supabase.sh — verify a Supabase project responds correctly
# for the OurChapter OS app's critical read paths. Used after applying
# migrations to an ephemeral clone or to prod, per
# docs/EPHEMERAL_CLONE_TESTING.md.
#
# Usage:
#   ./scripts/smoke-test-supabase.sh <project-ref> <anon-key>
#
# Exits 0 if all checks pass, non-zero on first failure.

set -e

REF="${1:?project ref required (e.g. pnrbvaehjbabjckixoxt)}"
ANON_KEY="${2:?anon key required (Project Settings → API → anon key)}"

URL="https://${REF}.supabase.co/rest/v1"

# Each check: NAME|TABLE|EXPECT_NONEMPTY (yes/no)
# - chapters: must have rows; if empty, restoration didn't include them
# - profiles: must have rows
# - events: should have rows (chapter has FY arc planned)
# - saps: prod has SAP roster; clone should too
# - speakers: speaker library
# - budget_items / contract_checklists: nested behind events; verifies join/RLS works
# - sap_member_interest: new table from 078; verifies it exists post-migration
# - sap_event_engagements: from 040 / 080 corrective; verifies SAP V2 land works
CHECKS=(
  "chapters|chapters?select=id,name&limit=1|yes"
  "profiles|profiles?select=id&limit=1|yes"
  "events|events?select=id,title&limit=1|yes"
  "saps|saps?select=id,name&limit=1|yes"
  "speakers|speakers?select=id,name&limit=1|yes"
  "budget_items|budget_items?select=id&limit=1|no"
  "contract_checklists|contract_checklists?select=id&limit=1|no"
  "sap_member_interest|sap_member_interest?select=id&limit=1|no"
  "sap_event_engagements|sap_event_engagements?select=id&limit=1|no"
  "vendors|vendors?select=id&limit=1|no"
)

PASS=0
FAIL=0

for CHECK in "${CHECKS[@]}"; do
  IFS='|' read -r NAME PATH_AND_QUERY EXPECT_NONEMPTY <<< "$CHECK"
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

  if [ "$EXPECT_NONEMPTY" = "yes" ] && [ "$ROW_COUNT" -eq 0 ]; then
    echo "✗ ${NAME}: HTTP 200 but 0 rows (expected non-empty)"
    FAIL=$((FAIL + 1))
    continue
  fi

  echo "✓ ${NAME}: HTTP 200, ${ROW_COUNT} row(s)"
  PASS=$((PASS + 1))
done

echo ""
echo "Smoke test: ${PASS} passed, ${FAIL} failed"

if [ "$FAIL" -gt 0 ]; then
  echo ""
  echo "FAIL: at least one critical read path is broken on this project."
  echo "Investigate before promoting any migration."
  exit 1
fi

echo "All critical read paths healthy."
