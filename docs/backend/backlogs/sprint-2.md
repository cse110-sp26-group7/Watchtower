# Sprint 2 Backend Backlog (week of May 11 – May 18, 2026)

Backend team: Theo (Lead), Michael, Bishal, Gabrielle

Inputs from Sprint 1 (target Thursday EOD):
- Sprint 1 Task 1 outputs (event schema, API endpoint sketch, snippet integration design notes) feed Task 3 (snippet implementation) and Task 4 (reporting API) directly.
- Sprint 1 Task 2 (storage selection ADR) defines the persistence target for Task 2 (/ingest endpoint with D1 insert) and the read source for Task 4/5 (reporting API).
- Sprint 1 Task 3 (SDK pattern survey) provides reference patterns the snippet implementation can borrow.
- Sprint 1 Task 4 (Frontend/UX sync) feeds the schema's v1 update, which in turn shapes the API contract this sprint implements.

---

## How we work

- Each member takes one of the active tasks below based on strength or interest.
- Tracking issues already created (see issue ref under each task below).
- If you get stuck, post in Slack `#backend` or DM me (Theo).

---

## Task summary

| #   | Task                                                    | Owner           | Depends on |
| --- | ------------------------------------------------------- | --------------- | ---------- |
| 1   | Ingest Worker dev environment setup (wrangler scaffold) | Gabrielle       |            |
| 2   | /ingest endpoint prototype (with D1 insert)             | Theo           | #1         |
| 3   | Browser SDK + snippet integration                       | Michael, Bishal |            |
| 4   | Reporting API scaffold + GET /api/events                | Theo, Gabrielle | #1         |
| 5   | GET /api/summary (stretch)                              | Theo            | #4         |

---

## Tasks

### 1. Ingest Worker dev environment setup

Owner: Gabrielle

Path follows ARCHITECTURE.md section 9: the ingest Worker lives at `workers/ingest/`. The reporting API Worker (`workers/api/`) is scaffolded separately in Task 4.

Deliverables:
- `workers/ingest/` directory structure (`src/`, `test/`, `wrangler.jsonc`, `eslint.config.mjs`, `vitest.config.js`)
- `workers/ingest/README.md` with a local dev guide (prereqs, install, `npm run dev`, tests, lint, deploy, env vars / secrets)
- Baseline `package.json`, `.gitignore`, and lint config

Scope:
- Set up Cloudflare Workers via `wrangler` (pinned in devDependencies, no global install required).
- Get the worker running locally via `npm run dev` on `http://localhost:8787`.
- Confirm one hello-world endpoint responds with 200 / `Hello World!`.
- `npm test` (vitest via `@cloudflare/vitest-pool-workers`) and `npm run lint` both pass on the scaffold.

Why ahead of /ingest endpoint: Task 2 below needs this scaffolding to run on top of.

Reference: [Cloudflare Workers official guide](https://developers.cloudflare.com/workers/get-started/guide/)

---

### 2. /ingest endpoint prototype (with D1 insert)

Owner: Theo
Issue: #62

Deliverables:
- `POST /ingest` handler wired into `workers/ingest/src/index.js` (extend the scaffold's `fetch` handler; split into a separate module if it grows past a screen)
- Basic envelope parsing: extract `project_id` and `events[]` from the JSON body
- D1 insert: events written to the `events` table via the existing `DB` binding (already wired in `workers/ingest/wrangler.jsonc`)
- A local test script (curl or fetch example) demonstrating end-to-end ingest into D1
- A brief README section or JSDoc

Scope:
- No per-event schema validation yet. Reject only on malformed JSON or missing envelope fields.
- Auth deferred: accept any `project_id` for now. Sprint 4 adds project lookup against the `projects` table.
- Rationale for including D1 insert this sprint: MVP demo (Sprint 3) needs the dashboard to read real ingested data. A pure console-log mock would push D1 integration into Sprint 3 alongside FE/BE integration, which is too tight.

Depends on: Sprint 2 Task 1 completion (scaffold + D1 binding).

---

### 3. Browser SDK + snippet integration

Owner: Michael, Bishal (co-owners)
Issues: #37 (SDK), #41 (delivery ADR)

Suggested split between co-owners (not strict, adjust as needed):
- Sub-area A: SDK code (`client/watchtower.js`, local validation against stub or real `/ingest` depending on Task 2 progress).
- Sub-area B: Distribution + demo + delivery ADR (npm publish setup, jsDelivr verification, integration doc, teammate-app end-to-end, MADR-format ADR).

Deliverables:
- `client/watchtower.js` (per ARCHITECTURE.md section 9): browser SDK that auto-captures `window.onerror` and `unhandledrejection`, exposes a manual `window.watchtower.captureEvent()` API, reads `project_id` from the `<script>` tag's `data-project` attribute via `document.currentScript.dataset.project`, and posts events to `POST /ingest` via `navigator.sendBeacon`. Envelope follows `endpoints-draft.md` (client-generated `event_id` as UUIDv4, ISO 8601 timestamp).
- npm publish setup: `package.json`, package name (coordinate with team on namespace, for example `@watchtower/sdk`), publish workflow.
- jsDelivr CDN verification: after the first publish, load the SDK from `https://cdn.jsdelivr.net/npm/<package>/watchtower.js` and confirm it behaves identically to the local file.
- Integration doc (`docs/backend/api/integration.md`): snippet form (`<script src="..." data-project="wt_xxx"></script>`), where to paste, what gets captured, how to test, basic troubleshooting.
- End-to-end demo against a teammate's existing app: paste snippet, trigger errors, confirm events reach `/ingest` and land in D1. No self-built test app this sprint.
- Delivery ADR (MADR format) under `docs/backend/adr/`: documents snippet + CLI two-track distribution decision, jsDelivr CDN choice, `data-project` attribute ID injection, alternatives considered, consequences.

Scope:
- Pure browser-side, vanilla JS only (per project constraints).
- SDK code can proceed in parallel with Task 2 (use a local stub endpoint during development).
- npm namespace and account setup need a team-level decision before the first publish.
- Final end-to-end demo (error in teammate's app → snippet → `/ingest` → D1) depends on Task 2.

ID injection model: Sentry-style `data-project` attribute on the `<script>` tag. This is one of the two standard snippet patterns (the other being a dashboard-generated inline init call). endpoints-draft.md already assumes this form (section "POST /ingest", Auth subsection).

Distribution choice (jsDelivr CDN via npm publish) reflects the 2026-05-09 backend-Ethan whiteboard.

Inputs from Sprint 1 Task 1: project ID format, manual capture API, send mechanism, and auto-capture scope are decided in Sprint 1 Task 1's design notes. This task implements against those decisions.

---

### 4. Reporting API scaffold + GET /api/events

Owner: Theo, Gabrielle
Issue: #63

Deliverables:
- `workers/api/` scaffold mirroring `workers/ingest/` (`src/`, `test/`, `wrangler.jsonc`, `eslint.config.mjs`, `vitest.config.js`, `package.json`, `README.md`)
- D1 binding wired to the same `watchtower` database used by `workers/ingest/` (read access)
- `GET /api/events` handler per `endpoints-draft.md`: query params `project_id` (required), `type` (default `error`), `since`/`until`, `cursor`, `limit` (default 50, max 200); cursor-based keyset pagination on `(timestamp, event_id)`; returns `{ events, next_cursor, has_more }`
- A local test script (curl or fetch) demonstrating: ingest a few events via Task 2, then read them back via this endpoint with type filter
- A brief README section or JSDoc

Scope:
- Auth deferred: no signed-cookie check this sprint. Sprint 4 adds session auth (ADR-0005).
- Defense-in-depth on `project_id`: required query param, returned events are scoped to it.
- CORS: same policy as `/ingest` (public origin OK for MVP; revisit when auth lands).

Depends on: Sprint 2 Task 1 (scaffold pattern to mirror, D1 binding setup). Can start in parallel with Task 2 since the read path is independent of the ingest path; if Task 2 lands first, end-to-end test (ingest → query) becomes trivial.

---

### 5. GET /api/summary (stretch)

Owner: Theo
Issue: #64

Deliverables:
- `GET /api/summary` handler per `endpoints-draft.md`: query params `project_id` (required), `window` (default `24h`), `timezone` (default UTC); returns `{ totals, timeseries, site_status }` with error counts, feedback aggregates, performance p75 per Web Vital, hourly timeseries for errors and feedback
- Aggregation SQL against D1 (count, percentile_disc for p75, time bucketing)
- A local test script demonstrating: ingest sample events of mixed types, then call /api/summary and verify aggregates match

Scope:
- Marked as stretch: MVP demo (Sprint 3) can show error frequency via client-side aggregation of GET /api/events results if this endpoint isn't ready in time.
- Auth deferred: same as Task 4.
- If stretch slips, this task carries over to Sprint 3 Week 1, ideally before FE wires the dashboard overview screen.

Depends on: Sprint 2 Task 4 (scaffold + D1 read access).
