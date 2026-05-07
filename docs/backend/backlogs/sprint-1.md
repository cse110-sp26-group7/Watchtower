# Sprint 1 Backend Backlog (Week of May 4 – May 10, 2026)

Sprint goal: Per Jack's direction (after first standup, 5/5), this sprint is research/planning only, theory and surface-level exploration. Backend research focus: how a Test App connects to WatchTower (the integration contract). Implementation tasks are deferred to Sprint 2, after Kareem's Repo + UML lands by Thursday.

Sprint type: Design & Prototyping (per project doc).

Backend team: Theo (Lead), Michael, Bishal, Gabrielle

---

## How we work

- Each member claims one of the active tasks below based on strength or interest.
- After claiming, create a GitHub Issue and self-assign. (Label and tracking conventions are still TBD)
- Research deliverables target end of week (~Thursday) to align with the team-wide planning-phase deadline.
- If you get stuck, post in Slack `#backend` or DM me (Theo).

---

## Task summary (this sprint)

| #   | Task                                     | Owner                                 | Depends on |
| --- | ---------------------------------------- | ------------------------------------- | ---------- |
| 1   | Event schema draft + API endpoint sketch | Theo                                  |            |
| 2   | Cloudflare storage selection ADR 0001    | Gabrielle                             |            |
| 3   | Observability SDK pattern survey         | Bishal + Michael (each picks 2 tools) |            |

---

## Tasks

### 1. Event schema draft + API endpoint sketch

Owner: Theo

Deliverables:
- `docs/backend/api/event-schema.json` with example payloads for error, feedback, and deploy events
- `docs/backend/api/endpoints.md` with a rough API endpoint outline (`POST /ingest`, `GET /events`, and so on) plus short design notes (why a flat structure, why a type discriminator, where deploy_id sits, etc.)

Scope:
- Cover only the common fields that come from the domain itself (event_id, app_id, timestamp, environment, event_type, deploy_id, etc.).
- Wireframes are not yet finalized, so this draft is explicitly labeled "v0, subject to revision after design."
- It will be updated to v1 after the Frontend/UX sync meeting.
- Incorporate findings from Task 3 (SDK pattern survey) when shaping the integration approach.

ADR note: No ADR for this task. The schema is a v0 spec, not a stabilized decision. Once it solidifies (likely Sprint 2 after the Frontend/UX sync), the key design choices will be captured as a separate ADR.

---

### 2. Cloudflare storage selection ADR 0001

Owner: Gabrielle

Deliverables:
- `docs/backend/adr/0001-storage-selection.md` (MADR format)

Scope:
- Identify the relevant Cloudflare storage products for our use case (the ADR's "alternatives considered" section).
- Compare the candidates across characteristics, query capability, pricing, and free-tier limits.
- Map them to WatchTower's requirements, including dashboard queries that need filter/sort/join and the possibility of large log volume.
- State a tentative decision with rationale and limitations.

Why an ADR: Migration cost is high once a storage choice is locked in, and the project doc requires ADRs for all major technical decisions.

---
### 3. Observability SDK pattern survey

Owner: Bishal + Michael (each picks 2 tools, results merged into one doc)

Candidate tools (pick from this pool or propose another):
- Sentry: error tracking, industry standard
- PostHog: referenced by the project doc
- Datadog: enterprise comprehensive observability
- Grafana Cloud: open source, fullstack monitoring platform
- Bugsnag: error tracking

Deliverables:
- `docs/backend/research/sdk-patterns.md`: a single comparison doc covering 4 tools total. For each tool, note: how the client integrates (script tag, npm SDK, both); what credential or identifier the client uses (DSN, project key, API key); the shape of the wire-level event payload; anything else notable.

Scope:
- Output feeds Task 1's contract design and gives the team a concrete reference for how a Test App should connect to WatchTower.

Why: Jack asked backend to research "How to connect Test App with our Software" during the planning phase. Surveying how established tools handle this gives us a real reference instead of guessing.

---

## Future tasks (Sprint 2)

Deferred until Kareem's Repo + UML lands and the architecture is settled.

| #   | Task                                                     | Owner    | Depends on |
| --- | -------------------------------------------------------- | -------- | ---------- |
| 1   | Frontend/UX sync meeting                                 | Theo     |            |
| 2   | Backend dev environment setup (wrangler, repo structure) | Bishal   |            |
| 3   | Mock ingestion endpoint prototype                        | _(open)_ | #2         |

### 1. Frontend/UX sync meeting

Owner: Theo

Deliverables:
- Meeting notes (attendees, agreements, open questions)
- A list of the dashboard screens the frontend team is designing, to feed Sprint 1 Task 1's v1 schema update

Scope:
- Meet with whoever is available from Frontend (Thy, Cindy, Johnny) and UX (Thy, Aarnav, Benny) once their Sprint 1 user-decisions land (target Thursday).
- Hear the current state of their wireframes.
- Agree on what data each screen needs. This becomes the foundation for the v1 API contract.
- Best timed early in Sprint 2 so the v1 schema update can follow.

---

### 2. Backend dev environment setup

Owner: Bishal (claim preserved)

Deliverables:
- `backend/` directory structure (`src/`, `test/`, `wrangler.toml`, etc.)
- `backend/README.md` with a local dev guide (wrangler install, `wrangler dev`, environment variables)
- Baseline `package.json`, `.gitignore`, and lint config

Scope:
- Set up Cloudflare Workers and the wrangler CLI.
- Get a worker running locally via `npm run dev`.
- Confirm one hello-world endpoint responds correctly.

Why ahead of mock ingestion: Task 3 below needs this scaffolding to run on top of.

Reference: [Cloudflare Workers official guide](https://developers.cloudflare.com/workers/get-started/guide/)

---

### 3. Mock ingestion endpoint prototype

Owner: _(open)_

Deliverables:
- `backend/src/ingest.js` containing the `POST /ingest` handler
- A local test script (curl or fetch example)
- A brief README section or JSDoc

Scope:
- No real validation or storage; just log the received JSON and return 200.
- No schema validation either. Integration with the schema spec happens once it stabilizes.

Depends on: Sprint 2 Task 2 completion.
