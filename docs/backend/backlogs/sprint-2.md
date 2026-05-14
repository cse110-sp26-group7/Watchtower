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

Path: `workers/ingest/` (per ARCHITECTURE.md section 9). `workers/api/` is scaffolded separately in Task 4.

Deliverables:
- `workers/ingest/` scaffold (`src/`, `test/`, `wrangler.jsonc`, `eslint.config.mjs`, `vitest.config.js`, `package.json`, `.gitignore`)
- README with local dev guide (npm run dev, tests, lint, deploy)
- Hello-world endpoint; `npm test` + lint passing

Why first: Task 2 builds on top of this.

Reference: [Cloudflare Workers official guide](https://developers.cloudflare.com/workers/get-started/guide/)

---

### 2. /ingest endpoint prototype (with D1 insert)

Owner: Theo
Issue: #62

Deliverables:
- `POST /ingest` handler in `workers/ingest/` with envelope parsing and D1 insert
- Local test script (curl or fetch) and brief README/JSDoc

Scope:
- Skip per-event schema validation; reject only on malformed JSON or missing envelope fields
- Auth deferred (Sprint 4 adds project lookup)

Spec: `docs/backend/api/endpoints-draft.md` (POST /ingest)
Rationale for D1 insert this sprint: Sprint 3 MVP demo needs real read path; pushing D1 to Sprint 3 stacks with FE/BE integration.
Depends on: Task 1

---

### 3. Browser SDK + snippet integration

Owner: Michael, Bishal (co-owners)
Issues: #37 (SDK), #41 (delivery ADR)

Suggested split between co-owners (not strict, adjust as needed):
- Sub-area A: SDK code (`client/watchtower.js`, local validation against stub or real `/ingest` depending on Task 2 progress).
- Sub-area B: Distribution + demo + delivery ADR (npm publish setup, jsDelivr verification, integration doc, teammate-app end-to-end, MADR-format ADR).

Deliverables:
- `client/watchtower.js` browser SDK implementing the contract in `endpoints-draft.md` (auto-capture + manual API, `project_id` via `data-project` attribute, `sendBeacon` to `/ingest`)
- npm publish + jsDelivr CDN distribution
- Integration doc (`docs/backend/api/integration.md`): snippet form, how to embed, how to test
- End-to-end demo against a teammate's existing app (no self-built test app this sprint)
- Delivery ADR (MADR format) under `docs/backend/adr/`: snippet + CLI two-track distribution, jsDelivr choice, `data-project` injection, alternatives, consequences

Scope:
- Vanilla JS, browser-side only
- npm namespace decision needed before first publish
- Final e2e demo depends on Task 2

Spec: `endpoints-draft.md` (POST /ingest, Auth subsection)
Reference: ARCHITECTURE.md section 9, 2026-05-09 backend-Ethan whiteboard

---

### 4. Reporting API scaffold + GET /api/events

Owner: Theo, Gabrielle
Issue: #63

Deliverables:
- `workers/api/` scaffold mirroring `workers/ingest/`, with D1 read binding
- `GET /api/events` handler per `endpoints-draft.md`
- Local test script (ingest via Task 2, read back here)
- Brief README/JSDoc

Scope:
- Auth deferred (Sprint 4, ADR-0005)
- CORS same as `/ingest` (public origin for MVP)

Spec: `endpoints-draft.md` (GET /api/events)
Depends on: Task 1 (scaffold pattern). Can start parallel to Task 2.

---

### 5. GET /api/summary (stretch)

Owner: Theo
Issue: #64

Deliverables:
- `GET /api/summary` handler per `endpoints-draft.md`
- Aggregation SQL against D1
- Local test script verifying aggregates

Scope:
- Stretch: MVP can do client-side aggregation of `/api/events` if this slips
- Auth deferred (same as Task 4)
- If slips, carries over to Sprint 3 Week 1

Spec: `endpoints-draft.md` (GET /api/summary)
Depends on: Task 4