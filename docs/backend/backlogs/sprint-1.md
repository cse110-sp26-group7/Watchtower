# Sprint 1 Backend Backlog (Week of May 4 – May 10, 2026)

Sprint goal: Lay the foundation for the WatchTower backend: a draft data model, a working dev environment, a storage decision, and a first ingestion path that runs end to end.

Sprint type: Design & Prototyping (per project doc). No heavy coding; the focus is exploration, design, and prototyping.

Backend team: Theo (Lead), Michael, Bishal, Gabrielle

---

## How we work

- Each member claims one of the five tasks below based on strength or interest. The default is one task per person.
- After claiming, create a GitHub Issue and self-assign. (Label and tracking conventions are still TBD by Jack.)
- Claiming deadline is Tuesday (5/5) evening. The backlog is then reported to Jack (Scrum Master / Product Owner).
- If you get stuck, post in Slack `#backend` or DM me (Theo).

---

## Task summary

| #   | Task                                                     | Owner    | Depends on |
| --- | -------------------------------------------------------- | -------- | ---------- |
| 1   | Event schema draft + API endpoint sketch                 | Theo     |            |
| 2   | Backend dev environment setup (wrangler, repo structure) | _(open)_ |            |
| 3   | Mock ingestion endpoint prototype                        | _(open)_ | #2         |
| 4   | Cloudflare storage selection ADR 0001                    | _(open)_ |            |
| 5   | Frontend/UX sync meeting                                 | Theo     |            |

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

ADR note: No ADR for this task. The schema is a v0 spec, not a stabilized decision. Once it solidifies (likely Sprint 2 after the Frontend/UX sync), the key design choices will be captured as a separate ADR.

---

### 2. Backend dev environment setup

Owner: _(open)_

Deliverables:
- `backend/` directory structure (`src/`, `test/`, `wrangler.toml`, etc.)
- `backend/README.md` with a local dev guide (wrangler install, `wrangler dev`, environment variables)
- Baseline `package.json`, `.gitignore`, and lint config

Scope:
- Set up Cloudflare Workers and the wrangler CLI.
- Get a worker running locally via `npm run dev`.
- Confirm one hello-world endpoint responds correctly.

Why this is first: Task 3 (mock ingestion) needs this scaffolding to run on top of.

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
- No schema validation either. Integration with Task 1 happens in Sprint 2 or later.

Depends on: Task 2 completion.

---

### 4. Cloudflare storage selection ADR 0001

Owner: _(open)_

Deliverables:
- `docs/backend/adr/0001-storage-selection.md` (MADR format)

Scope:
- Identify the relevant Cloudflare storage products for our use case (the ADR's "alternatives considered" section).
- Compare the candidates across characteristics, query capability, pricing, and free-tier limits.
- Map them to WatchTower's requirements, including dashboard queries that need filter/sort/join and the possibility of large log volume.
- State a tentative decision with rationale and limitations.

Why an ADR: Migration cost is high once a storage choice is locked in, and the project doc requires ADRs for all major technical decisions.

---

### 5. Frontend/UX sync meeting

Owner: Theo

Deliverables:
- Meeting notes (attendees, agreements, open questions)
- A list of the dashboard screens the frontend team is designing, to feed Task 1's v1 schema update

Scope:
- Meet with whoever is available from Frontend (Thy, Cindy, Johnny) and UX (Thy, Aarnav, Benny).
- Hear the current state of their wireframes.
- Agree on what data each screen needs. This becomes the foundation for the v1 API contract.
- Target later this week, since the meeting is only useful once the wireframes have some shape.

---

## Unclaimed tasks

If any task is still unclaimed by Tuesday (5/5) evening, backend lead will assign it provisionally and report the result to Jack.
