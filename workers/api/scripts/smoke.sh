#!/usr/bin/env bash
# End-to-end manual smoke test for the reporting API.
#
# Requires:
#   - workers/ingest running on :8787 (cd workers/ingest && npm run dev)
#   - workers/api    running on :8788 (cd workers/api    && npm run dev -- --port 8788)
#   - workers/api/.dev.vars with SESSION_SECRET=<anything> (session signing)
#
# Round-trips a real event end-to-end: POSTs an error event to workers/ingest,
# which writes it to D1, then logs in as the seeded demo user and reads the
# event back via the session-gated GET /api/events (ADR-0005), then logs out.
#
# The default project is wt_demo: /api/* requires the project to be owned by
# the session user, and the migrations seed wt_demo as owned by usr_demo.

set -euo pipefail

INGEST_URL="${INGEST_URL:-http://localhost:8787/ingest}"
API_BASE="${API_BASE:-http://localhost:8788}"
PROJECT="${PROJECT:-wt_demo}"
EMAIL="${EMAIL:-demo@watchtower.dev}"
PASSWORD="${PASSWORD:-demo1234}"
EVENT_ID="$(uuidgen | tr '[:upper:]' '[:lower:]')"
NOW="$(date -u +%Y-%m-%dT%H:%M:%S.000Z)"
COOKIE_JAR="$(mktemp)"
trap 'rm -f "$COOKIE_JAR"' EXIT

echo "POST $INGEST_URL"
curl -fsS -X POST "$INGEST_URL" \
	-H 'Content-Type: application/json' \
	-d "$(cat <<EOF
{
  "project_id": "$PROJECT",
  "events": [{
    "event_id": "$EVENT_ID",
    "event_type": "error",
    "timestamp": "$NOW",
    "environment": "dev",
    "message": "smoke test",
    "name": "Error",
    "stack": "Error: smoke test\n    at smoke.sh",
    "handled": false
  }]
}
EOF
)"
echo

echo "POST $API_BASE/api/login ($EMAIL)"
curl -fsS -X POST "$API_BASE/api/login" \
	-H 'Content-Type: application/json' \
	-H 'X-Watchtower-Auth: 1' \
	-c "$COOKIE_JAR" \
	-d "{\"email\": \"$EMAIL\", \"password\": \"$PASSWORD\"}" | python3 -m json.tool
echo

echo "GET $API_BASE/api/events?project_id=$PROJECT&since=1h (with session cookie)"
curl -fsS "$API_BASE/api/events?project_id=$PROJECT&since=1h" \
	-H 'X-Watchtower-Auth: 1' \
	-b "$COOKIE_JAR" | python3 -m json.tool
echo

echo "GET $API_BASE/api/summary?project_id=$PROJECT&window=24h (with session cookie)"
# The just-ingested error should show in totals.errors, the latest 1h bucket of
# timeseries.errors, and flip site_status to "issues" (error within 15 min).
curl -fsS "$API_BASE/api/summary?project_id=$PROJECT&window=24h" \
	-H 'X-Watchtower-Auth: 1' \
	-b "$COOKIE_JAR" | python3 -m json.tool
echo

echo "GET without cookie is rejected (expect 401)"
STATUS="$(curl -s -o /dev/null -w '%{http_code}' \
	-H 'X-Watchtower-Auth: 1' \
	"$API_BASE/api/events?project_id=$PROJECT&since=1h")"
echo "-> $STATUS"
[ "$STATUS" = "401" ]

echo "POST $API_BASE/api/logout"
curl -fsS -X POST "$API_BASE/api/logout" \
	-H 'X-Watchtower-Auth: 1' \
	-b "$COOKIE_JAR" | python3 -m json.tool
