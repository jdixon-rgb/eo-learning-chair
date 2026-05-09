#!/usr/bin/env bash
# post-deploy-check.sh — pilot's pre-flight for prod after every merge.
#
# Runs automated checks and prints a single-page status report. Items
# this script can't verify (Sentry, visual UI) are listed at the bottom
# as manual cues.
#
# Usage:
#   ./scripts/post-deploy-check.sh [<prod-anon-key>]
#
# If <prod-anon-key> is provided, also runs the REST smoke test for
# critical read paths. Without it, only the local + git + supabase-CLI
# checks run — still useful but with a SKIPPED row at the bottom.
#
# Exit codes:
#   0 — all checks green or warnings only
#   1 — one or more checks failed; do not consider this deploy healthy

set +e  # we want to keep running and report all results, not bail on first failure

PROD_REF="pnrbvaehjbabjckixoxt"
PROD_URL="https://app.ourchapteros.com"
ANON_KEY="${1:-}"

PASS=0
FAIL=0
WARN=0
SKIP=0

# Output helpers — keep glanceable.
ok()    { printf "  \033[32m✓\033[0m %s\n" "$1"; PASS=$((PASS+1)); }
fail()  { printf "  \033[31m✗\033[0m %s\n" "$1"; if [ -n "$2" ]; then printf "      %s\n" "$2"; fi; FAIL=$((FAIL+1)); }
warn()  { printf "  \033[33m⚠\033[0m %s\n" "$1"; if [ -n "$2" ]; then printf "      %s\n" "$2"; fi; WARN=$((WARN+1)); }
skip()  { printf "  \033[90m-\033[0m %s\n" "$1"; if [ -n "$2" ]; then printf "      \033[90m%s\033[0m\n" "$2"; fi; SKIP=$((SKIP+1)); }

section() { printf "\n\033[1m%s\033[0m\n" "$1"; }

printf "\n\033[1mPost-deploy check — %s\033[0m\n" "$(date '+%Y-%m-%d %H:%M:%S %Z')"
printf "Prod: \033[36m%s\033[0m → Supabase \033[36m%s\033[0m\n" "$PROD_URL" "$PROD_REF"

# ─── 1. Code & repo ──────────────────────────────────────────────────
section "1. Code & repo"

CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" = "main" ]; then
  warn "On main locally — usually we run this from staging" "git checkout staging when you're done"
else
  ok  "On '$CURRENT_BRANCH' (not main, good)"
fi

git fetch origin main --quiet 2>&1
COMMITS_BEHIND=$(git rev-list --count main..origin/main 2>/dev/null || echo 0)
if [ "$COMMITS_BEHIND" -eq 0 ]; then
  ok  "Local main matches origin/main"
else
  warn "Local main is behind origin/main by $COMMITS_BEHIND commits" "git pull origin main"
fi

EXPECTED_VERSION=$(grep -oE '"[0-9]+\.[0-9]+\.[0-9]+"' src/lib/version.js | tr -d '"')
ok  "Repo version: v$EXPECTED_VERSION"

UNCOMMITTED=$(git status --porcelain | grep -v "^??" | wc -l | tr -d ' ')
if [ "$UNCOMMITTED" -eq 0 ]; then
  ok  "No uncommitted tracked changes"
else
  warn "$UNCOMMITTED uncommitted tracked file(s)"
fi

# ─── 2. Build sanity ─────────────────────────────────────────────────
section "2. Build sanity"

# Run a quick dependency check rather than full build — full build is slow.
if [ -d node_modules ]; then
  ok  "node_modules present"
else
  fail "node_modules missing" "run: npm install"
fi

# Verify the build script exists and is invokable
if grep -q '"build":' package.json; then
  ok  "package.json has build script"
else
  fail "No build script in package.json"
fi

# ─── 3. Database (via Supabase CLI) ──────────────────────────────────
section "3. Database"

LINKED_REF=$(cat supabase/.temp/project-ref 2>/dev/null || echo "")
if [ "$LINKED_REF" = "$PROD_REF" ]; then
  ok  "Supabase CLI linked to PROD ($PROD_REF)"
else
  warn "Supabase CLI linked to $LINKED_REF (not prod)" "supabase link --project-ref $PROD_REF"
fi

if [ "$LINKED_REF" = "$PROD_REF" ]; then
  MIGRATION_OUTPUT=$(supabase migration list --linked 2>&1)
  if echo "$MIGRATION_OUTPUT" | grep -qE '^\s+[0-9]+\s+\|\s+[0-9]+\s+\|\s+[0-9]+\s*$'; then
    PENDING=$(echo "$MIGRATION_OUTPUT" | grep -E '^\s+[0-9]+\s+\|\s+\|' | wc -l | tr -d ' ')
    APPLIED=$(echo "$MIGRATION_OUTPUT" | grep -E '^\s+[0-9]+\s+\|\s+[0-9]+\s+\|\s+[0-9]+\s*$' | wc -l | tr -d ' ')
    if [ "$PENDING" -eq 0 ]; then
      ok  "Prod migrations: $APPLIED applied, 0 pending"
    else
      fail "Prod has $PENDING pending migrations" "supabase db push --linked --yes (CAREFUL — read MIGRATION_PLAYBOOK.md first)"
    fi
  else
    warn "Could not parse migration list output" "manual: supabase migration list --linked"
  fi
else
  skip "Migration check (CLI not linked to prod)"
fi

# ─── 4. App liveness (via HTTP) ──────────────────────────────────────
section "4. App liveness"

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -m 10 "$PROD_URL")
if [ "$HTTP_CODE" = "200" ]; then
  ok  "$PROD_URL returns HTTP 200"
else
  fail "$PROD_URL returns HTTP $HTTP_CODE" "Vercel deploy may have failed; check vercel.com"
fi

# Try to confirm the deployed bundle's APP_VERSION matches repo by
# scraping the JS bundle. This is best-effort — if Vercel changes the
# bundling pattern this regex stops matching, which is fine (we'd fall
# back to manual visual check).
HTML=$(curl -s -m 10 "$PROD_URL" 2>&1)
JS_BUNDLE=$(echo "$HTML" | grep -oE '/assets/index-[A-Za-z0-9_-]+\.js' | head -1)
if [ -n "$JS_BUNDLE" ]; then
  DEPLOYED_VERSION=$(curl -s -m 10 "$PROD_URL$JS_BUNDLE" 2>&1 | grep -oE 'APP_VERSION="?[0-9]+\.[0-9]+\.[0-9]+"?' | head -1 | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' || echo "")
  if [ -n "$DEPLOYED_VERSION" ]; then
    if [ "$DEPLOYED_VERSION" = "$EXPECTED_VERSION" ]; then
      ok  "Deployed bundle version v$DEPLOYED_VERSION matches repo"
    else
      warn "Deployed v$DEPLOYED_VERSION ≠ repo v$EXPECTED_VERSION" "Vercel may still be deploying — wait 60s and re-run"
    fi
  else
    skip "Could not extract version from deployed bundle" "minified JS pattern may have changed"
  fi
else
  skip "Could not locate deployed JS bundle"
fi

# ─── 5. REST smoke test ──────────────────────────────────────────────
section "5. REST smoke test"

if [ -n "$ANON_KEY" ]; then
  if [ -x "scripts/smoke-test-supabase.sh" ]; then
    SMOKE_OUTPUT=$(./scripts/smoke-test-supabase.sh "$PROD_REF" "$ANON_KEY" 2>&1)
    SMOKE_EXIT=$?
    SMOKE_PASS=$(echo "$SMOKE_OUTPUT" | grep -c '^✓')
    SMOKE_FAIL=$(echo "$SMOKE_OUTPUT" | grep -c '^✗')
    if [ $SMOKE_EXIT -eq 0 ]; then
      ok  "$SMOKE_PASS critical read paths healthy"
    else
      fail "$SMOKE_FAIL critical read path(s) failing" "$(echo "$SMOKE_OUTPUT" | grep '^✗' | head -3)"
    fi
  else
    warn "scripts/smoke-test-supabase.sh missing or not executable"
  fi
else
  skip "REST smoke test (no anon key provided)" "Re-run with: $0 <prod-anon-key>"
fi

# ─── 6. Manual verification cues ─────────────────────────────────────
section "6. Manual verification (do these visually)"

cat <<'EOF'
  • Open app.ourchapteros.com → confirm sidebar footer shows the version we just shipped
  • Dashboard renders YOUR real events (not mock titles like "Exponential Future")
  • /partners loads the Active|Prospect|Past toggle without the red error banner
  • /portal/forum loads agenda/parking lot/reflections for a member account
  • Sentry has no new error spike in the last 10 min
EOF

# ─── Summary ─────────────────────────────────────────────────────────
printf "\n\033[1mSummary\033[0m\n"
printf "  \033[32m%d passed\033[0m, " "$PASS"
printf "\033[33m%d warned\033[0m, " "$WARN"
printf "\033[31m%d failed\033[0m, " "$FAIL"
printf "\033[90m%d skipped\033[0m\n" "$SKIP"

if [ $FAIL -gt 0 ]; then
  printf "\n\033[31;1mDEPLOY UNHEALTHY\033[0m — investigate before considering this push complete.\n\n"
  exit 1
elif [ $WARN -gt 0 ]; then
  printf "\n\033[33;1mDEPLOY HEALTHY (with warnings)\033[0m — review the warnings above.\n\n"
  exit 0
else
  printf "\n\033[32;1mDEPLOY HEALTHY\033[0m — clear for normal operation.\n\n"
  exit 0
fi
