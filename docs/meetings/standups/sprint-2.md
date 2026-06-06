# Sprint 2 Standups (2026-05-11 → 2026-05-18)

Cadence: Mon / Wed / Fri on Slack `#watchtower-standups`, mirrored here.

---

## 2026-05-11 (Mon) — Sprint 2 kickoff standup

**Attendees:** Kareem, Theo, Michael, Gabrielle, Bishal, Thy, Nhan, Ethan, Johnny, Benny, Aarnav
**Format:** Zoom, ~20 min.

**Updates:**
- **Kareem** — Architecture is stable; will spend Sprint 2 reviewing PRs and writing ADR backfill as decisions stabilize.
- **Theo (BE)** — Scaffolding `/ingest` worker; first POST handler this week.
- **Michael (BE)** — Will land the schema migration (PR #43 follow-up) early in the sprint.
- **Gabrielle (BE)** — Worker dev environment in place; will help reviewer-load.
- **Bishal (BE)** — Starting SDK skeleton in `client/watchtower.js`; capturing errors + page-load timing.
- **Thy (FE)** — Building dashboard shell with mock data — overview, error log, perf, feedback views (#24).
- **Nhan (DevOps)** — Setting up the CI pipeline (stretch goal); ESLint + tests on PR.
- **Ethan (DevOps)** — Installing SDK on the club site so we have a real source of events by Sprint 3 (#45).
- **Johnny (FE)** — Will pair with Thy on the error log view.
- **Benny / Aarnav (QA)** — Drafting the test plan (#46).

**Blockers:** None.

**Decisions:**
- FE builds against mock data this sprint, real API contract integration in Sprint 3.

---

## 2026-05-13 (Wed) — Mid-sprint standup

**Attendees:** Kareem, Theo, Michael, Gabrielle, Bishal, Thy, Nhan, Ethan, Johnny, Benny
**Format:** Zoom, ~25 min.

**Updates:**
- **Theo** — `/ingest` POST handler in progress; validation against the event-schema draft works for `error` and `pageview` types locally.
- **Michael** — Schema migration merged.
- **Bishal** — SDK captures `window.onerror` and `unhandledrejection`; in-memory batching with `sendBeacon` flush on `pagehide` working in the test page.
- **Thy** — Dashboard shell rendering all views with mock data; hash routing working.
- **Johnny** — Error log table sortable; search bar wired (mock data only).
- **Nhan** — CI workflow opens on every PR — ESLint passes, no test suite yet.
- **Ethan** — SDK loads on the club site behind a feature flag; not flushing to ingest yet (waiting on Theo).
- **Benny / Aarnav** — Test plan drafted, will circulate today for sign-off.

**Blockers:**
- Theo + Ethan need to align on the deploy header convention before the SDK can post live; aiming for Friday.

**Decisions:**
- Adopt `X-Watchtower-Project-Id` header for project authentication on `/ingest`.

---

## 2026-05-15 (Fri) — Pre-weekend standup

**Attendees:** Kareem, Theo, Michael, Gabrielle, Bishal, Thy, Nhan, Ethan, Benny
**Format:** Slack async + 10-min Zoom check-in.

**Updates:**
- **Theo** — `/ingest` round-trips a real event to D1 locally; will deploy to staging Worker tonight.
- **Michael** — Reviewed Theo's `/ingest` PR; minor changes requested on validation error messages.
- **Bishal** — SDK page-load timing instrumented; CLS observer added.
- **Thy** — Dashboard shell complete; mock data exhaustive enough for FE/BE contract conversation in Sprint 3.
- **Ethan** — SDK live on club site; first events arriving in the local Worker's logs.
- **Nhan** — CI green on all open PRs; planning to add unit-test job in Sprint 3.
- **Benny** — Test plan approved by Kareem; will scope QA's Sprint 3 tasks against it.

**Blockers:** Scheduling — finding a common time across 13 people is hard; team leads agreed to schedule pair sessions instead of full-team blocks.

**Decisions:**
- Sprint 2 done. Sprint 3 planning Sunday.
- Retro for Sprint 2: scheduling pain noted; resolution = lead-to-lead pairing.
