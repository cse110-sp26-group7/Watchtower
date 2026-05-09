# API Endpoints Draft

Status: Phase B draft, Sprint 1 Task 1. Pending review (Backend team, Tech Lead).

## Conventions

- All payloads are JSON (UTF-8).
- All timestamps are ISO 8601 UTC with ms precision.
- Server enriches inbound requests with: server-side `received_at` timestamp, parsed User-Agent, country (`cf-ipcountry` header).

---

## Endpoint inventory

| Method | Path           | Worker           | Purpose                                  | Status                 |
| ------ | -------------- | ---------------- | ---------------------------------------- | ---------------------- |
| POST   | `/ingest`      | `workers/ingest` | Accept events from snippet + CI/CD       | Phase B contract below |
| POST   | `/api/login`   | `workers/api`    | Issue signed session cookie              | Sketch (Sprint 2+)     |
| GET    | `/api/events`  | `workers/api`    | Filtered event listing with pagination   | Sketch (Sprint 2+)     |
| GET    | `/api/summary` | `workers/api`    | Aggregated counts for dashboard overview | Sketch (Sprint 2+)     |
| GET    | `/api/deploys` | `workers/api`    | Recent deploy events for correlation     | Sketch (Sprint 2+)     |

`/ingest` is the only endpoint with a fixed contract this sprint; it is the integration target for Sprint 2 Task 3 (snippet implementation). The `/api/*` group is sketched here for surface-area visibility but final shapes are deferred to a Sprint 2+ pass after the dashboard wireframe is locked in.

---

## POST /ingest

Single ingestion endpoint for both browser snippet and CI/CD deploy events.

### Request

Headers:

- `Content-Type: application/json` (fetch path) or `text/plain;charset=UTF-8` (sendBeacon path; body is still JSON-encoded)

Body (envelope):

```json
{
  "project_id": "wt_a1b2c3d4",
  "events": [ <event>, ... ]
}
```

Each `<event>` follows `event-schema-draft.md` (event_id, event_type, timestamp, environment, deploy_id, type-specific fields). `project_id` lives only on the envelope; events do not carry it individually.

### Auth

`project_id` is the public project API key. Worker looks it up against the `projects` table; unknown id returns 401.

- Browser: embedded in snippet at script load time, e.g. `<script src=".../watchtower.js" data-project="wt_a1b2c3d4">`.
- CI/CD: same id included in the request body when GitHub Actions posts deploy events.

No separate secret. Spam mitigation belongs to rate-limiting (see Open Questions), not auth.

### Responses

- `204 No Content` — all events accepted. No body.
- `400 Bad Request` — malformed JSON, missing envelope fields, or any event fails schema validation. Body: `{ "error": "<short_code>", "message": "<human readable>", "error_at": <event index | null> }`.
- `401 Unauthorized` — unknown or missing `project_id`.
- `413 Payload Too Large` — body exceeds the size limit (limit TBD, see Open Questions).
- `429 Too Many Requests` — rate limit exceeded (mechanism TBD, see Open Questions).

### Partial-batch failure

All-or-nothing. If any event in `events[]` fails validation, the entire batch is rejected with 400 and `error_at` indicates the first offending event index. Rationale: simpler ingest path (one transaction, one decision); bandwidth cost of resending a small batch is acceptable for MVP. Per-event partial-accept can be added later if dropped-event rates become a problem.

### CORS

Public endpoint (any monitored app's origin may post). The worker responds with:

- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: POST, OPTIONS`
- `Access-Control-Allow-Headers: Content-Type`
- Handles `OPTIONS` preflight with 204.

### Idempotency

`event_id` is a client-generated UUIDv4 used as the dedup key. Backend treats `event_id` as a unique constraint at the storage layer; replays of the same event_id are silently accepted (still 204) but the row is not duplicated. This makes ingest safe under at-least-once delivery (network retries, sendBeacon reissue, lost-but-not-really responses).

---

## Reporting API — sketch

Routes are listed in the inventory above. Owned by `workers/api/` (separate Worker from `workers/ingest/`). All endpoints except `POST /api/login` are authenticated by a signed session cookie (ADR 0005).

Open items deferred to Sprint 2+ pass:

- Response body shapes for each endpoint.
- Exact query parameters and validation rules.
- Pagination strategy (cursor vs offset; page size cap).
- Aggregation buckets and time windows for `/api/summary`.

Source: ARCHITECTURE.md section 3.4. Finalization gated on Frontend/UX wireframe lock-in.

---

## Decision notes

1. **Batch over single.** Initially considered single-event-per-POST, switched to `{ events: [...] }` batch. Reasons: ARCHITECTURE.md section 3.1/section 4 already describes the SDK as "batches in memory and flushes via sendBeacon," and `sendBeacon` only fires once on page unload, so batching at the wire level is the only way to avoid losing events. Industry standard for browser observability snippets (Sentry envelope, PostHog `/batch/`, Datadog RUM, LogRocket).
2. **204 over 200+body.** Followed ARCHITECTURE.md section 3.2 ("Returns 204 on success so clients don't waste bandwidth on response bodies"). Note: industry majority is `200 OK + small JSON` (Sentry, PostHog, Segment, Mixpanel). 204 is reasonable here because `sendBeacon` does not read the response, and the bandwidth argument applies to the `fetch` fallback. Revisit at Tech Lead sync if a debug echo (e.g., event_id confirmation) becomes useful.
3. **project_id on envelope, not per event.** Switched from per-event common field to envelope-level. Reasons: a batch is always single-project (one snippet = one project); duplicating `project_id` across N events wastes bandwidth and adds a per-event cross-check. Standard for batch envelopes (PostHog `api_key`, Segment `writeKey`). Triggers a small revision to event-schema-draft.md (remove `project_id` from common fields; document at envelope level).
4. **project_id == public API key.** Single identifier, no separate secret. Matches ARCHITECTURE.md section 3.1 ("public project API key embedded at script load time") and the `projects` table description ("Holds the project API key"). Public-token model, like PostHog. Server-side deploy events from CI/CD use the same id; if spoofed-deploy concerns escalate, a separate ingest key can be added in a later ADR.

## Open questions

- Body size limit for batches. Cloudflare Worker default is 100MB; we likely want a much smaller policy limit (e.g., 1MB) to bound abuse and ingest latency.
- Rate-limiting policy. Per `project_id`? Per IP? Sliding window thresholds? Owned by a follow-up ADR.
- Whether server-side deploy events should require a separate ingest secret. Currently the same `project_id` is used for both; Kareem flagged this as acceptable for MVP.
- Reporting API exact response shapes — finalize after frontend wireframe lock-in.

## References

- ARCHITECTURE.md sections 3.1, 3.2, 3.4, 4
- event-schema-draft.md (per-event schema; will be revised post this draft to drop envelope-level `project_id`)
- task1-design-notes.md (Kareem and Jack feedback log)
- ADR 0005 signed-cookie-auth (referenced for Reporting API auth)
