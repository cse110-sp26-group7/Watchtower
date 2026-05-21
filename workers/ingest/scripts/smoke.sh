#!/usr/bin/env bash
# Smoke check for POST /ingest against a running Worker (local or deployed).
# Usage:
#   ./scripts/smoke.sh                 # defaults to http://localhost:8787
#   BASE_URL=https://... ./scripts/smoke.sh
#
# Pair with `npm run dev` in another terminal for local checks.
# vitest (`npm test`) covers the full contract; this script proves the live
# Worker responds end-to-end and is useful against a deployed instance.

set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:8787}"
FAILED=0

red()    { printf '\033[31m%s\033[0m\n' "$*"; }
green()  { printf '\033[32m%s\033[0m\n' "$*"; }
yellow() { printf '\033[33m%s\033[0m\n' "$*"; }

assert_status() {
  local expected="$1" actual="$2" name="$3"
  if [ "$actual" = "$expected" ]; then
    green "  PASS  $name -> $actual"
  else
    red   "  FAIL  $name -> expected $expected, got $actual"
    FAILED=1
  fi
}

post_status() {
  curl -s -o /dev/null -w '%{http_code}' \
    -X POST "$BASE_URL/ingest" \
    -H 'Content-Type: application/json' \
    --data "$1"
}

options_status() {
  curl -s -o /dev/null -w '%{http_code}' \
    -X OPTIONS "$BASE_URL$1" \
    -H 'Origin: https://example.com' \
    -H 'Access-Control-Request-Method: POST' \
    -H 'Access-Control-Request-Headers: Content-Type'
}

yellow "Target: $BASE_URL"

EVENT_ID=$(uuidgen)
SESSION_ID=$(uuidgen)
TS="$(date -u +%Y-%m-%dT%H:%M:%S).000Z"

GOLDEN_BODY=$(cat <<EOF
{
  "project_id": "wt_smoke",
  "events": [{
    "event_id": "$EVENT_ID",
    "event_type": "error",
    "timestamp": "$TS",
    "environment": "prod",
    "message": "smoke test",
    "name": "TypeError",
    "handled": false,
    "url": "https://example.com/smoke",
    "session_id": "$SESSION_ID"
  }]
}
EOF
)

# 1. Golden path
assert_status 204 "$(post_status "$GOLDEN_BODY")" "1. Golden path (POST /ingest)"

# 2. Idempotent replay (same event_id should be absorbed)
assert_status 204 "$(post_status "$GOLDEN_BODY")" "2. Idempotent replay"

# 3. Malformed JSON
assert_status 400 "$(post_status '{"bad')" "3. Malformed JSON"

# 4. OPTIONS preflight (allowed path) + (unknown path)
assert_status 204 "$(options_status /ingest)"  "4a. OPTIONS /ingest"
assert_status 404 "$(options_status /unknown)" "4b. OPTIONS /unknown"

echo
if [ "$FAILED" -eq 0 ]; then
  green "All smoke checks passed."
else
  red "Some smoke checks failed."
  exit 1
fi
