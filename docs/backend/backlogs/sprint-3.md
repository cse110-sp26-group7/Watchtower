# Sprint 3 Backend Backlog (week of May 18 – May 25, 2026)

Backend team: Theo (Lead), Michael, Bishal, Gabrielle

Sprint 3 is the MVP integration sprint. Backend ships almost no new features; the work is landing Sprint 2 carryovers, deploying to Cloudflare, and supporting FE + Test App so real errors flow end to end onto the dashboard.

---

## Inputs from Sprint 2

Landed on `main`:
- Browser SDK (PR #70): `client/watchtower.js`, npm publish, jsDelivr CDN, integration doc, ADR-0007
- ADR-0006 (CLI/SDK strategy), CLI scaffold

Open PRs blocking Sprint 3 start (Sprint 2 carryover):
- `/ingest` endpoint prototype with D1 insert (PR #78, Theo). Also lands the polymorphic schema refactor (envelope columns + `payload` TEXT JSON per ARCHITECTURE.md section 3.3) that #66 will rebase onto.
- Reporting API scaffold + `GET /api/events` (PR #66, Gabrielle)

Mid-sprint context:
- Cloudflare account was reset; new D1 ID is `c65d1f5e-5f88-4381-958b-fbbcbb1c00f0`. Task 2 updates `workers/api/wrangler.jsonc`; Task 4 needs account access to deploy.

---

## Sprint 3 goal (backend slice)

A real error from Ethan's Test App is visible on the dashboard via SDK → `/ingest` → D1 → `/api/events` → Log Viewer. Data Visualizer renders a basic error-frequency chart from real data.

This is mostly an integration sprint. We are not building auth, project CRUD, event-detail view, or deploy-event ingestion. Those are Sprint 4 per `docs/sprints/sprint-4.md` and ADR-0005.

---

## How we work

- Each member claims at least one open task. Carryover PR owners stay on their PR.
- Issues already exist for carryovers (#62, #63). New tasks get new issues before work starts.

---

## Task summary

| #   | Task                                                 | Owner     | Depends   |
| --- | ---------------------------------------------------- | --------- | --------- |
| 1   | Land `POST /ingest` (PR #78)                         | Theo      |           |
| 2   | Land Reporting API + `GET /api/events` (PR #66)      | Gabrielle | #1 schema |
| 3   | Remote D1 migration apply + schema doc update        | Theo      | #1, #2    |
| 4   | Cloudflare prod deploy + CORS verification           | open      | #3        |
| 5   | SDK end-to-end on Ethan's Test App                   | open      | #4        |
| 6   | FE-BE integration sync (Log Viewer, Data Visualizer) | Theo      | #4        |
| 7   | `GET /api/summary` for Data Visualizer               | open      | #2, #3    |

---

## Tasks

### 1. Land `POST /ingest`

Owner: Theo
PR: #78 (open)
Issue: #62

Deliverables:
- Address review on PR #78 and merge to `main`
- Local round-trip smoke: `wrangler d1 migrations apply watchtower --local`, send a sample event, verify row in `events`
- Note in PR body: marked as Sprint 2 carryover landing in Sprint 3 Week 1

Why first: every downstream task (API smoke, prod deploy, Test App E2E) needs the schema and ingest path on `main`. Until #78 lands, Sprint 3 is on hold.

Scope:
- No new features; only review fixes
- Schema collision resolved inside #78: lands the polymorphic envelope + `payload` JSON shape per ARCHITECTURE.md section 3.3. #66 rebases onto it (Task 2)

### 2. Land Reporting API + `GET /api/events`

Owner: Gabrielle
PR: #66 (open)
Issue: #63

Deliverables:
- Rebase #66 onto post-#78 `main`, absorbing the polymorphic schema shift (envelope columns + `payload` TEXT JSON per ARCHITECTURE.md section 3.3):
	- Remove stray `db/schema.sql`; its content now lives in `db/migrations/0001_events.sql` (from #78), which is the canonical schema
	- Drop `db/migrations/0001_init.sql` (redundant with `0001_events.sql`)
	- Shift `query.js` from typed columns to `json_extract(payload, '$.key')` for type-specific fields (e.g. `json_extract(payload, '$.message') AS message`)
	- Null-stripping row shaper becomes a no-op once `payload` only carries the type's keys
	- Update test fixtures and `test/index.spec.js` assertions to the new row shape
	- Update `workers/api/wrangler.jsonc` `database_id` to `c65d1f5e-5f88-4381-958b-fbbcbb1c00f0` (post-Cloudflare-account-reset D1)
- Address remaining review on PR #66
- After Task 1 lands, run `scripts/smoke.sh` against real `/ingest`; paste output in the PR
- Merge to `main`

Spec: `docs/backend/api/endpoints-draft.md` (`GET /api/events` section)

Scope:
- Auth deferred to Sprint 4 per ADR-0005; keep `TODO(sprint-4)` comment
- Timestamps: SDK sends canonical ISO-8601 UTC ms with `Z` (per `event-schema-draft.md`), so skip write-path normalization. Revisit only if drift shows up.
- No `(project_id, event_type, timestamp)` composite index this sprint (table scan acceptable for demo scale)

### 3. Remote D1 migration apply + schema doc update

Owner: Theo
Issue: new (create before starting)

Deliverables:
- `wrangler d1 migrations apply watchtower --remote` runs cleanly against the team's Cloudflare D1
- Update `docs/backend/api/event-schema-draft.md` to reflect the polymorphic envelope + `payload` JSON shape landed in #78

Why: schema reconciliation got absorbed into #78 (polymorphic shift to match ARCHITECTURE.md section 3.3) and #66's rebase (query/test/wrangler updates). What remains is applying the consolidated migration on remote D1 and aligning the schema doc with what shipped.

### 4. Cloudflare prod deploy + CORS verification

Owner: open
Issue: new

Deliverables:
- `workers/ingest/` and `workers/api/` deployed via `wrangler deploy`
- Public `*.workers.dev` URLs recorded in `docs/backend/api/integration.md` and repo `README.md`
- CORS smoke from dashboard origin: `OPTIONS` + `GET` from the Cloudflare Pages preview URL returns 2xx with `Access-Control-Allow-Origin` matching
- Migration applied on remote D1 (Task 3 already does the apply; this task verifies prod read/write through the deployed worker)

Scope:
- One Cloudflare account for the team; ping Ethan for access if claimant doesn't have it
- `workers.dev` URLs only; no custom domain this sprint
- `Access-Control-Allow-Origin: *` is fine for MVP per `endpoints-draft.md` (revisit in Sprint 4)

### 5. SDK end-to-end on Test App

Owner: open
Issue: new (create before starting)
Depends on: Task 4 (prod `/ingest` URL)

Deliverables:
- Snippet embedded on Ethan's club site (`<script src="https://cdn.jsdelivr.net/...watchtower.js" data-project="wt_..." defer>`) — coordinate with Ethan
- One real error fired from the site (instrumented button or known broken path)
- Verify the event appears via `GET /api/events?project_id=...&type=error` against the prod API URL
- Append a "verified end to end" note to `docs/backend/api/integration.md` with date and the test event_id

Scope:
- Use the jsDelivr CDN form (not a local script), so the team can reproduce the install
- One `project_id` for the demo; insert it directly into `projects` table if Sprint 4's project CRUD is not in place yet
- Do not block on a fancy demo UI: a single thrown error is enough for the QA hand-off

### 6. FE-BE integration sync

Owner: Theo
Issue: new (create before starting)
Depends on: Task 4

Deliverables:
- 30-min sync with FE (Thy, Cindy, Johnny — Log Viewer + Data Visualizer owners)
- Hand off prod `/api/events` base URL plus 2–3 sample response payloads (error / performance / feedback)
- Walk through query params (`type`, `since`, `cursor`, `limit`), cursor pagination semantics, and `event` row shape
- Capture any FE-side asks (extra fields, shape tweaks) as follow-up issues, not in-sprint changes

Why: FE has been on mock data through Sprint 2. The mock-to-real cutover is the most likely place Sprint 3 ends with regressions (cursor null handling, timestamp timezone, empty-state). One scheduled sync beats async Slack debugging Friday night.

### 7. `GET /api/summary` (stretch)

Owner: open
Depends on: Task 2, Task 3
Issue: #64

Deliverables:
- `GET /api/summary` handler in `workers/api/` per `endpoints-draft.md`
- Errors-only timeseries: 1h buckets over a 24h window (`SELECT strftime(...) FROM events WHERE project_id = ? AND event_type = 'error' AND timestamp >= ?`)
- Local + smoke tests
- Skip `feedback_avg`, `performance_p75`, `site_status` this sprint — Sprint 4 picks those up under Summary Health View

Scope:
- Stretch: if it slips, FE aggregates the same buckets client-side from `/api/events`. Decide which way Wednesday at smoke checkpoint; document the call in Sprint 3 retro.
- Auth deferred (same as Task 2)

---

## Out of scope (Sprint 4 picks up)

Per `docs/sprints/sprint-4.md` and ADR-0005:
- `POST /api/login` and session cookie auth
- `GET /api/projects` and `POST /api/projects`
- `GET /api/events/:event_id` (detail view with deploy correlation)
- `GET /api/deploys` and CI deploy-event ingestion path
- Full `/api/summary` (feedback aggregates, perf p75, `site_status`)
- Alerts, notifications, source-map symbolication
