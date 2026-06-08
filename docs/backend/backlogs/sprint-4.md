# Sprint 4 Backend Backlog (week of May 25 - June 1, 2026)

Backend team: Theo (Lead), Michael, Bishal, Gabrielle

Sprint 4 layers user-facing features onto the Sprint 3 MVP. The backend headline is authentication, project CRUD, and a summary endpoint. The auth decisions were reviewed against the project's docs and constraints, and most have a grounded default; the auth tasks below are written against those defaults. Task 4 ratifies them as ADR-0005 and settles the three remaining open items (CSRF mitigation, session lifetime, custom domain), so the auth slice can proceed without a from-scratch debate. Tasks 1-3 are auth-independent and can start immediately.

The grounded defaults and the three open items are listed under Task 4.

---

## Inputs from Sprint 3

Landed on `main`:
- `POST /ingest` with polymorphic schema, envelope columns + `payload` TEXT JSON (PR #78)
- `GET /api/events` with keyset pagination (PR #66)
- Remote D1 migration applied + storage-shape doc (PR #102)
- Cloudflare prod deploy: ingest + api on `*.workers.dev`, recorded in README and `integration.md` (PR #110)
- SDK end-to-end on the Test App (PR #109)
- CLI deploy implemented (PR #90)

Still open from Sprint 3 (carryover):
- FE is still partly on mock data. The `/api/events` cutover (FE `api-client.js` replacing `mock_dashboard_data.js`) is not fully landed.

Current backend gaps relevant this sprint:
- No `projects` table exists. `project_id` is not validated on ingest (`TODO(Sprint 4)` at `workers/ingest/src/index.js:92`).
- `workers/api` serves only `GET /api/events`. No summary, login, or projects routes.

---

## Sprint 4 goal (backend slice)

Ship the auth-independent backend features first: a `GET /api/summary` for the Summary Health View, a `projects` table with ingest validation, and support for finishing the FE `/api/events` cutover. In parallel, ratify ADR-0005 from the grounded defaults (Task 4) and land the auth slice: login, session gating, and project CRUD, before sprint end.

Scope this sprint: auth + project CRUD + summary. Deploy signal tracking, event-detail view, and alerts are Sprint 5 (see Out of scope).

---

## How we work

- Owners are open. Each member claims at least one task. Dependencies are listed per task.
- New tasks get a GitHub issue before work starts (present title + body for approval first, per repo convention).
- The auth tasks (4-9) are written against the grounded defaults summarized under Task 4. Task 4 ratifies them via ADR-0005 and decides the three open items; if the team rejects a default, revisit the affected task.

---

## Task summary

| #   | Task                                                     | Owner      | Depends | Status |
| --- | -------------------------------------------------------- | ---------- | ------- | ------ |
| 1   | FE-BE integration carryover (`/api/events` cutover)      | Theo       |         | Done (PR #138, #139) |
| 2   | `GET /api/summary`                                       | Gabrielle  |         | Done (PR #128) |
| 3   | `projects` table + demo seed + ingest `project_id` check | Michael    |         | Done (PR #126) |
| 4   | ADR-0005 (ratify defaults + decide open items)           | Theo       |         | Done (PR #122) |
| 5   | Auth schema migration (users, sessions, projects.owner)  | Bishal     | #3, #4  | Done (PR #143) |
| 6   | `POST /api/login` + PBKDF2 hashing                       | Bishal     | #5      | Done (PR #148) |
| 7   | Session middleware + CORS change + `POST /api/logout`    | Theo       | #6, #2  | Done (PR #152) |
| 8   | `GET/POST /api/projects` (user-scoped)                   | Michael    | #5, #7  | Carryover → Sprint 5 |
| 9   | FE auth cutover + re-gate `/api/events`                  | Gabrielle  | #6, #7  | Partial — gate merged (PR #152); FE half → Sprint 5 |

---

## Tasks

### 1. FE-BE integration carryover (`/api/events` cutover)

Owner: Theo
Issue: new (create before starting)

Deliverables:
- Hand off the live API base URL plus 2-3 sample response payloads (error / performance / feedback) to the FE team.
- Walk through cursor pagination (`next_cursor` / `has_more`), the polymorphic row shape, and timestamp handling (FE converts ISO-8601 `Z` to local).
- Support the FE `api-client.js` cutover off `mock_dashboard_data.js`.
- Capture FE-side asks (extra fields, shape tweaks) as follow-up issues, not in-sprint changes.

Keep `/api/events` ungated until the auth middleware lands (Task 7), so this cutover is not blocked by auth. Re-gating plus the FE `credentials: 'include'` change is Task 9.

Continues the Sprint 3 FE-BE integration work.

### 2. `GET /api/summary`

Owner: Gabrielle
Issue: new (Sprint 3 #64 was a summary stretch that never started; reuse or close it)

Deliverables:
- New handler in `workers/api/src/` per the `GET /api/summary` section of `endpoints-draft.md`.
- `totals`: `errors`, `feedback_count`, `feedback_avg`, `performance_p75` per Web Vital (LCP, INP, CLS, FCP, TTFB).
- `timeseries`: `errors` and `feedback` buckets over the window (1h buckets by default).
- `site_status`: `"ok"` if no error events in the last 15 minutes, else `"issues"`.
- Query params: `project_id` (required), `window` (default `24h`), `timezone` (optional).
- Local + smoke tests.

Built ungated for now. The session gate is added in Task 7 when the auth middleware lands; leave a `TODO(auth)` marker consistent with the existing `/api/events` markers in `index.js`.

Serves the High-priority "Summary View" and "Track Crashes Over Time" stories from `docs/sprints/sprint-4.md`.

### 3. `projects` table + demo seed + ingest `project_id` validation

Owner: Michael
Issue: new (create before starting)

Deliverables:
- New migration `db/migrations/0002_projects.sql`: `projects` table (`project_id` PK, `name`, `created_at`). No `owner` FK yet; the `owner_id` linkage is added in Task 5 once the `users` table exists.
- Seed the demo `project_id` used in the Sprint 3 E2E so existing flows keep working.
- Wire ingest: replace the `TODO(Sprint 4)` at `workers/ingest/src/index.js:92` with a `project_id` lookup against `projects`, returning 401 on an unknown id (per `endpoints-draft.md` POST /ingest Auth).
- Apply on local and remote D1; smoke test that a known id is accepted and an unknown id returns 401.

Why independent of the auth decisions: this is the public project-key path, not session auth. It does not touch cookies, sessions, or the `users` table.

Why now: `project_id` is currently unvalidated, and the `projects` table is a prerequisite for the auth schema (Task 5) and `GET/POST /api/projects` (Task 8).

---

### 4. ADR-0005 (signed-cookie-auth)

Owner: Theo
Issue: #123

Deliverables:
- Write `docs/adr/0005-signed-cookie-auth.md` in MADR format, recording the grounded defaults: cookie (not bearer), sessions table, PBKDF2, `SameSite=None; Secure` with credentialed CORS, email login, secret via `wrangler secret`.
- Decide and record the three open items: CSRF mitigation (proposed: require a custom header), session lifetime (proposed: 7-day absolute `Max-Age`), and custom domain (proposed: no this sprint).
- Coordinate the ADR number and placement with Kareem (he owns the `docs/adr/` scaffold; content is backend's per the ADR-0002 precedent).

Why first: it ratifies the decisions the rest of the auth tasks build on. Bring the defaults plus the three open items to `#backend`; this is a confirmation, not a from-scratch debate.

### 5. Auth schema migration + demo user seed

Owner: Bishal
Depends on: Task 3 (the `projects` table), Task 4 (ratified column shape)
Issue: new

Deliverables:
- New migration: `users` (`id` PK, `email` UNIQUE, `password_hash`, `salt`, `iterations`, `created_at`) and `sessions` (`session_id` PK, `user_id` FK, `created_at`, `expires_at`).
- Add `owner_id` (FK to `users`) to the `projects` table from Task 3; backfill the seeded demo project's owner.
- Seed one demo user (email + PBKDF2 hash) for the demo login.
- Apply on local and remote D1.

Column shape follows the grounded defaults: PBKDF2 needs salt + iterations + hash; the `sessions` table is the session source of truth. Users are seeded directly; there is no registration endpoint in the documented API.

### 6. `POST /api/login` + password hashing

Owner: open
Depends on: Task 5
Issue: new

Deliverables:
- PBKDF2 hash/verify helper using Web Crypto `SubtleCrypto` (SHA-256, around 100k iterations, per-user salt).
- `POST /api/login`: validate `{ email, password }`, verify against the `users` row, insert a `sessions` row, and set the signed session cookie (HMAC-signed `session_id`; `HttpOnly; Secure; SameSite=None`; `Max-Age` per the ADR). Return the `{ user, projects }` bundle (per `endpoints-draft.md`).
- Signing secret stored via `wrangler secret`.
- Status codes 200 / 400 / 401; local + smoke tests.

### 7. Session middleware + CORS change + logout

Owner: open
Depends on: Task 6 (cookie issuance); gates `/api/events` (already on main) and `/api/summary` (Task 2)
Issue: new

Deliverables:
- Middleware: read the cookie, verify the HMAC signature, look up the `sessions` row, reject if missing / invalid / expired (401). Attach the user for downstream handlers.
- Ownership: 403 when the requested `project_id` is not owned by the session user.
- Apply to `/api/*` except login. Flip the `TODO(auth)` markers on `/api/events` and `/api/summary` to enforced.
- CORS change: replace the Sprint 3 `Access-Control-Allow-Origin: *` with an echo of the specific dashboard origin plus `Access-Control-Allow-Credentials: true`; handle `OPTIONS`. This overrides the `SameSite=Strict` and `ACAO: *` in earlier docs (D3).
- CSRF mitigation per the ADR (proposed: required custom header).
- `POST /api/logout`: delete the session row and clear the cookie (fills the endpoints-draft gap).

### 8. `GET /api/projects` + `POST /api/projects` (user-scoped)

Owner: open
Depends on: Task 5 (`projects.owner_id`), Task 7 (middleware)
Issue: new

Deliverables:
- `GET /api/projects`: list projects where `owner_id` is the session user (per `endpoints-draft.md`).
- `POST /api/projects`: create a project, generate a `wt_` id, set `owner_id` to the session user, return the created row (201).
- Local + smoke tests.

Unblocks the FE project-selection page (PR #112) and the CLI registration flow (ADR-0006).

### 9. FE auth cutover + re-gate `/api/events`

Owner: Gabrielle (cross-team with FE)
Depends on: Task 6, Task 7
Issue: new

Deliverables:
- Once login and the CORS change land, FE adds `credentials: 'include'` and the `X-Watchtower-Auth` header to the `api-client.js` fetches so the session cookie rides along and passes the CSRF check.
- Re-gate `/api/events` (left ungated in Task 1) behind the middleware, and confirm the dashboard still loads end to end after gating.
- Coordinate timing with the FE owners so the cutover and gating land together, not split across a broken window.

Rollout note (from Task 7 implementation): deploys are tag-triggered (`v*`, deploy.yml), so the merged gate does not reach production until the next tag. That tag breaks the dashboard unless the FE fetches already send `credentials: 'include'` + `X-Watchtower-Auth`. Land the FE changes first, then tag; announce the tag hold in `#backend`.

---

## Out of scope (Sprint 5)

Per `docs/sprints/sprint-5.md`, ADR-0005, and the Sprint 4 planning notes (alerts and notifications explicitly pushed back):
- `GET /api/events/:event_id` (detail view with deploy correlation)
- `GET /api/deploys` + the CI deploy-event ingestion hook (GitHub Actions side)
- Alerts / notifications when new errors are detected
- Source-map upload and stack-trace symbolication
- Rate-limiting hardening on ingest

---

## Outcome (end of sprint)

Tasks 1-7 shipped; per-task PRs are in the Task summary status column. Also landed alongside: demo data consolidated to `wt_demo` (PR #145) and the DevOps deploy-event hook posting deploy events to `/ingest` on tag-triggered deploys (PR #141, #144).

Carryover — Task 8 and the FE half of Task 9 — moves to `sprint-5.md`.
