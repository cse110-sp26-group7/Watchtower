# Sprint 3 Standups (2026-05-18 → 2026-05-25)

Cadence: Mon / Wed / Fri on Slack `#watchtower-standups`, mirrored here.

---

## 2026-05-18 (Mon) — Sprint 3 kickoff standup

**Attendees:** Kareem, Theo, Michael, Gabrielle, Bishal, Thy, Nhan, Ethan, Johnny, Benny, Aarnav, Jack, Cindy
**Format:** Zoom, ~30 min.

**Updates:**
- **Kareem** — Sprint 3 goal: connect Sprint 2 blocks end-to-end; MVP = developer can open WatchTower and see real data.
- **Theo (BE)** — `/ingest` prototype works; need a small bugfix and will open a PR today.
- **Michael (BE)** — Will write the SDK-integration ADR and update README this sprint.
- **Bishal (BE)** — SDK page-view tracking landing today; will help with backend connection.
- **Thy (FE)** — Layout + router stable; will rewire dashboard cards against the upcoming `/api/events` endpoint.
- **Johnny (FE)** — Error log page with mock data + simple search + filter; will swap to real data once API contract is firm.
- **Cindy (FE)** — Pairing with Thy on perf/feedback views.
- **Jack (DevOps)** — Owning CI/CD pipeline this sprint.
- **Ethan (DevOps)** — Finished CLI scaffold; starting Cloudflare migration.
- **Aarnav / Benny (QA)** — Will meet with TA Audria today to finalize QA scope.

**Blockers:**
- Need a status video by Thursday for prof's checkpoint.

**Decisions:**
- Goal: working prototype by Wednesday evening to leave buffer for the demo video.
- Schema is frozen — no further changes this sprint.
- ADR needed for SDK distribution (jsDelivr); Bishal/Michael own.

---

## 2026-05-20 (Wed) — Mid-sprint standup

**Attendees:** Kareem, Theo, Michael, Bishal, Thy, Nhan, Johnny, Benny, Jack
**Format:** Zoom, ~25 min.

**Updates:**
- **Theo** — `/ingest` patched; schema test passes; will demo the round-trip tonight.
- **Michael** — Working on SDK integration ADR; aims to merge before EOW.
- **Bishal** — SDK feature-complete for v1: errors, page views, Core Web Vitals, opt-in feedback widget.
- **Thy** — Pulled the API contract from Theo's draft; will wire dashboard against it once `/api/events` ships.
- **Johnny** — Error log page merged with mock data (#83 follow-ups); will rewire to real data once `/api/events` is up. Status video added.
- **Jack** — CI/CD pipeline draft up; ESLint + unit-test job runs on every PR. Working on tag-triggered deploy next.
- **Ethan, Theo, Kareem** — Need to review Gabby's storage PR follow-ups (ADR-0002).
- **Benny** — Tests 3 and 4 of the SDK test plan implemented (`SDK unit tests for Test 3 and Test 4`).

**Blockers:**
- FE waiting on `GET /api/events` from Theo (expected Thursday).

**Decisions:**
- ADR for SDK distribution (jsDelivr) approved in concept — Bishal to land as ADR-0007.

---

## 2026-05-22 (Fri) — Demo-eve standup

**Attendees:** Kareem, Theo, Michael, Gabrielle, Bishal, Thy, Nhan, Ethan, Johnny, Benny
**Format:** Zoom, ~25 min.

**Updates:**
- **Theo** — `GET /api/events` with keyset pagination landed; smoke test passes. API matrix job added to CI.
- **Michael** — Documented D1 storage shape in `event-schema-draft.md`.
- **Bishal** — SDK refactor merged; minified file (`watchtower.min.js`) added for CDN distribution.
- **Thy** — Dashboard wired to real `/api/events`; LCP/INP/CLS cards added; dark-mode tweaked.
- **Johnny** — Addressed Thy's feedback on PR #83; small CSS fixes for the error log table.
- **Ethan** — Workers deployed; smoke.sh round-trips against the live endpoints succeed.
- **Nhan** — CI lint-ignores `watchtower.min.js`; tracking jsDelivr's auto-minification next sprint.
- **Benny** — Status video v1 recorded for prof checkpoint.

**Blockers:**
- None that prevent end-of-sprint demo.

**Decisions:**
- Sprint 3 closes Sunday; retrospective scheduled.
