# API Endpoints Draft

| Path                    | Worker           | Method | Purpose                                  |
| ----------------------- | ---------------- | ------ | ---------------------------------------- |
| `/ingest`               | `workers/ingest` | POST   | Accept events from snippet + CI/CD       |
| `/api/login`            | `workers/api`    | POST   | Issue signed session cookie              |
| `/api/projects`         | `workers/api`    | GET    | List projects for the current user       |
|                         | `workers/api`    | POST   | Create a project (issues `wt_xxxx` id)   |
| `/api/summary`          | `workers/api`    | GET    | Aggregated counts for dashboard overview |
| `/api/events`           | `workers/api`    | GET    | Filtered event listing with pagination   |
| `/api/events/:event_id` | `workers/api`    | GET    | Single event detail                      |
| `/api/deploys`          | `workers/api`    | GET    | Recent deploy events for correlation     |

---

## POST /ingest

Single ingestion endpoint for both browser snippet and CI/CD deploy events.

### Request

Headers:

- `Content-Type`: depends on the client path. The server accepts both:
	- `application/json` for fetch path
	- `text/plain;charset=UTF-8` for sendBeacon path (browser-forced; body is still JSON-encoded)

Body (envelope):

```json
{
  "project_id": "wt_a1b2c3d4",
  "events": [ <event>, ... ]
}
```

Each `<event>` follows `event-schema-draft.md` (event_id, event_type, timestamp, environment, deploy_id, type-specific fields).

### Responses

- `204 No Content`: all events accepted. No body.
- `400 Bad Request`: malformed JSON, missing envelope fields, or any event fails schema validation.
- `401 Unauthorized`: unknown or missing `project_id`.
- `413 Payload Too Large`: body exceeds 1 MB or batch carries more than 100 events (see Provisional policies item 1 below).
- `429 Too Many Requests`: rate limit exceeded (see Provisional policies item 2 below).

### Behavior

#### Auth

`project_id` is the public project API key. Worker looks it up against the `projects` table; unknown id returns 401.

- Browser: embedded in snippet at script load time, e.g. `<script src=".../watchtower.js" data-project="wt_a1b2c3d4">`.
- CI/CD: same id included in the request body when GitHub Actions posts deploy events.

No separate secret. Spam mitigation belongs to rate-limiting (see Provisional policies item 2), not auth.

#### Partial-batch failure

All-or-nothing. If any event in `events[]` fails validation, the entire batch is rejected with 400 and `error_at` indicates the first offending event index. Rationale: simpler ingest path (one transaction, one decision); bandwidth cost of resending a small batch is acceptable for MVP. Per-event partial-accept can be added later if dropped-event rates become a problem.

#### CORS (Cross-Origin Resource Sharing)

Public endpoint (any monitored app's origin may post). The worker responds with:

- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: POST, OPTIONS`
- `Access-Control-Allow-Headers: Content-Type`
- Handles `OPTIONS` preflight with 204.

#### Idempotency

`event_id` is a client-generated UUIDv4 used as the dedup key. Backend treats `event_id` as a unique constraint at the storage layer; replays of the same event_id are silently accepted (still 204) but the row is not duplicated. This makes ingest safe under at-least-once delivery (network retries, sendBeacon reissue, lost-but-not-really responses).

---

## Reporting API

Routes live in `workers/api/` (separate Worker from `workers/ingest/`). All endpoints except `POST /api/login` require a signed session cookie (ADR 0005).

Source: ARCHITECTURE.md section 3.4 + 2026-05-09 wireframe review.

### POST /api/login

Request body: `{ "email": "string", "password": "string" }`

Response 200:
```json
{
  "user": { "id": "u_…", "email": "alice@example.com" },
  "projects": [
    { "project_id": "wt_a1b2c3d4", "name": "Marketing site" }
  ]
}
```
Sets `Set-Cookie: wt_session=<signed>; HttpOnly; Secure; SameSite=Strict`.

Why bundle `projects` here: landing screen needs the project picker; saves an extra round-trip.

Status codes: 200, 400 (malformed body), 401 (bad credentials).

### GET /api/projects

Lists projects the authenticated user owns.

Response 200:
```json
{
  "projects": [
    {
      "project_id": "wt_a1b2c3d4",
      "name": "Marketing site",
      "created_at": "2026-05-01T10:00:00.000Z"
    }
  ]
}
```

Status codes: 200, 401.

### POST /api/projects

Request body: `{ "name": "string" }`

Response 201:
```json
{
  "project_id": "wt_<8-12 random chars>",
  "name": "Marketing site",
  "created_at": "2026-05-09T14:32:11.234Z"
}
```

Backend generates `project_id`; not client-supplied.

Status codes: 201, 400 (missing/invalid name), 401.

### GET /api/summary

Aggregated counts + short timeseries for the dashboard overview screen.

Query params:
- `project_id` (required)
- `window` (optional, default `24h`): one of `1h | 24h | 7d | 30d`.
- `timezone` (optional): bucket boundaries. Default UTC.

Response 200:
```json
{
  "project_id": "wt_a1b2c3d4",
  "window": "24h",
  "generated_at": "2026-05-09T15:00:00.000Z",
  "totals": {
    "errors": 142,
    "feedback_count": 23,
    "feedback_avg": 3.8,
    "performance_p75": {
      "LCP": 2456, "FCP": 1234, "TTFB": 678, "CLS": 0.12, "INP": 198
    }
  },
  "timeseries": {
    "bucket_size": "1h",
    "errors":   [ { "t": "2026-05-08T15:00:00.000Z", "count": 5 }, … ],
    "feedback": [ { "t": "2026-05-08T15:00:00.000Z", "avg": 4.1, "count": 3 }, … ]
  },
  "site_status": "ok"
}
```

Design notes:
- `performance` summary uses p75 per Web Vital (Google's standard reporting percentile), not "avg response time" (averages mislead for distribution-shaped metrics). Confirm with team that p75 is acceptable, or switch to p50/p90 if the wireframe shows something specific.
- `site_status`: simple two-state indicator of whether the monitored app is currently running cleanly. Values: `"ok"` (no error events in the last 15 minutes) or `"issues"`. 
- `uptime`: intentionally omitted from this sketch. Measuring real uptime requires a synthetic probe (a separate worker that periodically pings each project's URL on a fixed schedule, independent of user traffic). Out of scope for this draft; revisit if the dashboard needs an uptime indicator.

Status codes: 200, 400 (bad params), 401, 403 (project not owned), 404 (unknown project_id).

### GET /api/events

Filtered event listing with pagination.

Query params:
- `project_id` (required)
- `type` (optional, default `error`): `error | performance | feedback | deploy`
- `since` (optional, default `24h`): ISO 8601 or relative shorthand (`1h`, `24h`, `7d`)
- `until` (optional): ISO 8601, default now
- `cursor` (optional): opaque cursor from previous response
- `limit` (optional, default 50, max 200)

Response 200:
```json
{
  "events": [ { "event_id": "…", "event_type": "error", … } ],
  "next_cursor": "<opaque|null>",
  "has_more": true
}
```

Each event object follows `event-schema-draft.md` plus server-enriched fields (`received_at`, parsed `user_agent`, `country`).

Pagination: cursor-based (keyset on `(timestamp, event_id)`), not offset. Reasons: stable under concurrent writes; D1's `(project_id, timestamp)` index supports it natively; avoids OFFSET cost growth on long lists.

Status codes: 200, 400, 401, 403, 404.

### GET /api/events/:event_id

Single event detail.

Query params:
- `project_id` (required): scope hint. This param adds defense-in-depth, hits the `(project_id, timestamp)` index, and keeps shape consistent with other reporting endpoints.

Response 200:
```json
{
  "event": { /* full event object as in /api/events */ },
  "related": {
    "deploy": { "deploy_id": "b1f2a4d", "version": "v0.1.0", "timestamp": "…" },
    "session_events": 3
  }
}
```

`related.deploy`: the most recent deploy event before this event's timestamp in the same environment. `null` if none. Drives the "likely culprit commit" UI per ARCHITECTURE.md section 4.
`related.session_events`: count of other events in the same `session_id` (useful for "what else happened around this error").

Status codes: 200, 401, 403, 404.

### GET /api/deploys

Recent deploy events for the deploy correlation view.

Query params:
- `project_id` (required)
- `since` (optional, default `30d`)
- `environment` (optional): `dev | staging | prod`
- `limit` (optional, default 50, max 200)

Response 200:
```json
{
  "deploys": [
    {
      "event_id": "…",
      "deploy_id": "b1f2a4d",
      "timestamp": "2026-05-09T10:00:00.000Z",
      "environment": "prod",
      "version": "v0.1.0"
    }
  ]
}
```

No pagination for v0: deploys are low-volume. Add cursor if a project ever exceeds ~50 deploys in the default window.

Status codes: 200, 400, 401, 403, 404.

---
## Conventions

- All payloads are JSON (UTF-8).
- All timestamps are ISO 8601 UTC with ms precision.
- Server enriches inbound requests with: server-side `received_at` timestamp, parsed User-Agent, country (`cf-ipcountry` header).

## Decision notes

1. **204 over 200+body.** Followed ARCHITECTURE.md section 3.2 ("Returns 204 on success so clients don't waste bandwidth on response bodies").
2. **project_id == public API key.** Single identifier, no separate secret. Matches ARCHITECTURE.md section 3.1 ("public project API key embedded at script load time") and the `projects` table description ("Holds the project API key"). Public-token model, like PostHog. Server-side deploy events from CI/CD use the same id; a separate ingest key can be added in a later ADR.

## Provisional policies

These are working numbers committed in this draft so Sprint 2 implementation has concrete targets. They are explicitly provisional and meant to be revisited once we observe real demo traffic; final values land in a follow-up ADR.

1. Batch body size: 1 MB per request, max 100 events per batch.
   - Why 1 MB: matches PostHog `/batch/` cap; well below Cloudflare Worker's 100 MB default, bounds memory and ingest latency.
   - Why 100 events: with worst-case ~10 KB stack-trace events, 100 events fit comfortably under 1 MB and leaves headroom for the envelope and JSON overhead.
   - Enforcement: snippet enforces both client-side at batch flush; ingest worker rejects with 413 if either bound is exceeded.

2. Rate limiting:
   - Per `project_id`: 60 requests/sec, sliding window (1-second bucket). At 100 events/req that is a 6,000 events/sec absolute ceiling, well above ADR-0002's "thousands of events per minute" stated worst case for normal traffic.
   - Per source IP: 30 requests/sec. Catches the "one actor cycles many project_ids" abuse shape that per-project limits miss.
   - Mechanism: Cloudflare Workers Rate Limiting binding (preferred, free tier); KV-counter fallback if binding access is gated.
   - Exceeded → 429 with body `{ "error": "rate_limited", "message": "...", "retry_after_ms": <int> }`.

3. Server-side deploy events: same `project_id`, no separate ingest secret.
   - Why: Kareem flagged this acceptable for MVP. Spoofed deploys can only pollute the `deploys` view; they cannot exfiltrate data or write to other tables.
   - Revisit trigger: If peer-review surfaces spoofed-deploy concerns, can add a separate CI-only ingest secret in a later ADR.
