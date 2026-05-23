#!/usr/bin/env bash
# End-to-end manual smoke test for the reporting API.
#
# Requires:
#   - workers/ingest running on :8787 (cd workers/ingest && npm run dev)
#   - workers/api    running on :8788 (cd workers/api    && npm run dev -- --port 8788)
#
# Round-trips a real event end-to-end: POSTs an error event to workers/ingest,
# which writes it to D1, then reads it back via GET /api/events on workers/api.
# (POST /ingest is live as of #62.)

set -euo pipefail

INGEST_URL="${INGEST_URL:-http://localhost:8787/ingest}"
API_URL="${API_URL:-http://localhost:8788/api/events}"
PROJECT="${PROJECT:-wt_smoke}"
EVENT_ID="$(uuidgen | tr '[:upper:]' '[:lower:]')"
NOW="$(date -u +%Y-%m-%dT%H:%M:%S.000Z)"

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

echo "GET $API_URL?project_id=$PROJECT&since=1h"
curl -fsS "$API_URL?project_id=$PROJECT&since=1h" | python3 -m json.tool
