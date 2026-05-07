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

| #   | Task                                                     | Owner                                 | Depends on |
| --- | -------------------------------------------------------- | ------------------------------------- | ---------- |
| 1   | Backend integration contract draft                       | Theo                                  |            |
| 2   | Cloudflare storage selection ADR 0001                    | Gabrielle                             |            |
| 3   | Observability tool integration survey                    | Bishal + Michael (each picks 2 tools) |            |
| 4   | Frontend/UX sync meeting                                 | Theo                                  | #1 Phase A |

---

## Tasks

### 1. Backend integration contract draft

Owner: Theo

Deliverables:
- `docs/backend/api/event-schema.json` with example payloads for error, feedback, and deploy events
- `docs/backend/api/endpoints.md` covering: rough API endpoint outline (`POST /ingest`, `GET /events`, etc.); short design notes (why a flat structure, why a type discriminator, where deploy_id sits); snippet integration approach (project ID format, manual capture API, send mechanism, auto-capture scope). Cross-team items (hosting, test app form) are flagged as open for team sync rather than decided unilaterally.

Workflow (two phases):
- Phase A (early to mid week): Rough structural sketch from domain knowledge plus early findings from Task 3 (SDK pattern survey). Just enough concrete shape to walk into the Frontend/UX sync (Task 4) with real proposals on the table. Explicitly labeled "rough draft, pending Frontend/UX sync."
- Phase B (after Task 4 sync): Refine into v1 informed by what data the dashboard actually needs from the frontend team.

Scope:
- Cover only the common fields that come from the domain itself (event_id, app_id, timestamp, environment, event_type, deploy_id, etc.).
- Output feeds Sprint 2 Task 3 (snippet implementation) directly.

ADR note: No ADR in Sprint 1. The schema is a v0 spec rather than a decision, and the snippet integration choices are tentative pending Frontend/UX sync and team alignment. Once the approach stabilizes (likely Sprint 2), the integration decisions (snippet vs SDK, project ID format, send mechanism, auto-capture scope) will be captured as a separate ADR.

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

### 3. Observability tool integration survey

Owner: Bishal + Michael (each picks 2 tools, results merged into one doc)

Candidate tools (pick from this pool or propose another):
- Sentry: error tracking, industry standard
- PostHog: referenced by the project doc
- Datadog: enterprise comprehensive observability
- Grafana Cloud: open source, fullstack monitoring platform
- Bugsnag: error tracking

Focus: We're not building an npm SDK. Our integration target is a script-tag snippet, so emphasize how each tool handles their script-tag/snippet integration mode. The npm SDK side is OK to skim.

Deliverables:
- `docs/backend/research/tool-integration-survey.md`: comparison doc covering 4 tools

Goal: a comparison doc that gives Task 1 enough reference to design our snippet integration. Topics worth covering include integration mechanism (especially script-tag mode), project identification, event payload shape, and demo app patterns. Format and depth up to you.

Scope:
- Pure research, no code
- Depth over breadth: 1-2 page doc, 4 tools total
- Coordinate on Slack so the two of you don't overlap on tool choice
- Output feeds Task 1's contract design and gives the team a concrete reference for how a Test App should connect to WatchTower

Why: Jack asked backend to research "How to connect Test App with our Software" during the planning phase. Surveying how established tools handle this gives us a real reference instead of guessing.

---

### 4. Frontend/UX sync meeting

Owner: Theo

Deliverables:
- Meeting notes (attendees, agreements, open questions)
- A list of the dashboard screens the frontend team is designing, to feed Task 1 Phase B (finalization)

Scope:
- Meet with whoever is available from Frontend (Thy, Cindy, Johnny) and UX (Thy, Aarnav, Benny) once their Sprint 1 user-decisions are mature enough (target Thursday or right after).
- Bring Task 1 Phase A rough sketch as the starting point so the conversation has a concrete artifact to react to.
- Hear the current state of their wireframes.
- Agree on what data each screen needs. This is the foundation for the v1 API contract.

---

## Future tasks (Sprint 2)

Carried-over implementation tasks live in a separate draft: `sprint-2.md`. Sprint 2 begins at the next sprint planning meeting (Mon May 11, 4:00 PM).
