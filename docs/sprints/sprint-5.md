# Sprint 5

- **Start date:** 2026-06-01
- **End date:** 2026-06-08
- **Sprint Goal:** Ship the production MVP — every Sprint 4 carryover lands, the demo is real, and documentation reflects what we actually built.

---

## Goals

- [ ] Authentication shipped end-to-end (carryover from Sprint 4): login page, session cookie, dashboard restricted to authenticated users.
- [ ] Summary health view answers "is the site up, any errors, any performance issues?" at a glance (carryover from Sprint 4).
- [ ] Deploy signal correlation visible in the dashboard — error timestamps can be matched to the deploy that introduced them (carryover from Sprint 4).
- [ ] Test suite covers unit + integration + E2E layers; all green on `main` for the entire week.
- [ ] CI/CD pipeline documented in `docs/devops/` — deploy flow, rollback procedure, secrets rotation, onboarding for the next maintainer
- [ ] README and `docs/ARCHITECTURE.md` updated to reflect the system as shipped (no stale references to dropped or unimplemented features)
- [ ] ADRs current: any decisions made in Sprints 4–5 captured as new ADRs; existing ones reviewed for accuracy.
- [ ] Final demo video recorded, linked from the README.
- [ ] Project retrospective complete and committed.

Low Priority:
- [ ] Alert / notification system fires on new errors (carryover from Sprint 4)
- [ ] Multi-project support: a single account can register and view multiple projects, with data isolation between them
- [ ] At least 2 external test apps integrated and visibly emitting real events to the dashboard
---

## Sprint Backlog

### User Stories

| User Story | GitHub Issue | Priority | Status |
|---|---|---|---|


### General Tasks

| Task | Team | GitHub Issue | Priority | Status |
|---|---|---|---|---|


---

## Sprint Board

| Name/Team | Task | GitHub Issue | Doc Link | Expected Finish |
|---|---|---|---|---|


---

## Definition of Done

| Criterion | Verification Method | Progress |
|---|---|---|
| Production system is publicly accessible behind the dashboard URL | Anyone with the URL can load the dashboard; non-authenticated users are redirected to login | Not Ready |
| Two external test apps emit live events visible on the dashboard | Tester triggers errors / performance metrics / feedback on both apps and confirms they appear in the dashboard within 30 seconds | Not Ready |
| A single account can manage two or more isolated projects | Tester logs in, creates two projects, switches between them on the dashboard, and confirms events from one project never appear under the other | Not Ready |
| Alert fires when a new error is detected | Tester triggers a new error and confirms an alert is delivered through the chosen channel (in-dashboard or external) without manual refresh | Not Ready |
| Summary health view answers the three core questions at a glance | Tester reviews the summary and can immediately tell: is the site up, are there errors, is performance degraded — without drilling into individual events | Not Ready |
| Deploy events appear correlated with error timeline on the dashboard | Tester triggers a deploy event (via tag-triggered CI), confirms it appears on the dashboard timeline next to errors emitted after that deploy | Not Ready |
| CI runs lint + unit + integration + E2E on every PR; all green on `main` for the full sprint | Inspect `main`'s Actions history at end of sprint: no red runs not immediately followed by a fix-PR | Not Ready |
| CI/CD pipeline is fully documented under `docs/devops/` | New reviewer reads the docs and can answer: how does a deploy fire, how do I roll back, how do secrets rotate, how do I add a new worker | Not Ready |
| README and `docs/ARCHITECTURE.md` match shipped system | Reviewer reads both top-to-bottom; flagged stale lines = 0 | Not Ready |
| All ADRs reflect real shipped behavior; Sprint 4–5 decisions captured | ADR-by-ADR walk-through: no decisions describing dropped features as live, no new decisions un-captured | Not Ready |
| Final demo video is recorded and linked from the README | Video demonstrates end-to-end: test app emits an error → dashboard shows it correlated to a recent deploy → alert fires → user acknowledges | Not Ready |
| Project retrospective committed to `docs/` | Retrospective lists what worked, what didn't, and lessons for future course projects | Not Ready |

---

## Dependencies & Risks

### Cross-team dependencies

| Dependency | Teams Involved | Status |
|---|---|---|
| Authentication must ship before multi-project support, user-scoped dashboard, and QA's full E2E pass can land | BE → FE → QA | Carryover from Sprint 4 — sequencing risk if auth slips |
| Deploy-event hook in CI required for "deploy signal correlation" feature on dashboard | DevOps → BE → FE | Carryover from Sprint 2 Task 5; not started |
| Demo video requires the full end-to-end flow working in production | All teams | Final-week — blocks on every other feature |
| README and `docs/ARCHITECTURE.md` polish needs system to be stable for an accurate snapshot | Tech Lead → all teams | Late-sprint; needs feature-freeze a day before recording |
| Final retrospective requires team availability before sprint end (overlaps with finals season) | All teams | Schedule slot in advance |

### Project-level risks

| Risk | Impact | Mitigation |
|---|---|---|
| No staging environment — every merge to `main` deploys to the same prod that demos against | One bad merge breaks the demo | Tag-triggered deploys (already in place) make accidental deploys harder; consider a feature freeze + tag a "demo-ready" `v0.x.y` before the final demo |
| Time pressure: lots of Sprint 4 carryover compressed into one final week alongside finals | Scope creep, late-night shipping, broken main | Cut scope aggressively early in sprint; feature-freeze 36 hours before demo; demo dry-run mid-week |

---

## Notes & Decisions

- Decided to push back: Multi test app, notifcations
---

## Retrospective _(planned end of Sprint 5 / end of project, 2026-06-07)_

**What went well:**
- Auth shipped end-to-end: login → signed session cookie → `/api/*` gated → logout (tagged `v0.0.6-updateAuth`).
- ADR discipline finally caught up: empty ADRs 0001 / 0003 / 0004 backfilled; four new ADRs added (Chart.js, retention, rate limiting, no-staging) capturing decisions that were previously implicit.
- CHANGELOG populated from tags; process artifacts (`docs/meetings/`) consolidated.
- `docs/devops/` describes deploy flow, rollback, and secrets rotation — useful for any future maintainer.
- CI stayed green on `main` through the freeze window.
- Demo video recorded; one external test app (Ethan's club site) live.
- Event detail + deploy correlation shipped (PR #161): `GET /api/events/:event_id` returns an error together with the deploy that likely introduced it.
- Backend tests run against the real Workers runtime (miniflare + in-memory D1), so the auth gate, ownership checks, and handler contracts are covered without mocking Cloudflare.

**What didn't go well:**
- E2E tests (Playwright), discussed since Sprint 2, only landed in the final two days (PR #164) — too late to catch anything during development.
- The session gate went live in prod (`v0.0.6-updateAuth`, June 4) three days before the FE auth cutover (PR #158, June 7), so the prod dashboard's API calls returned 403 in between.
- A few Sprint 4 carryovers (alerting/notifications, multi-project support beyond one demo project) were deferred to "post-MVP."
- Finals-week timing compressed the last 36 hours; some doc cleanup happened later than ideal.
- We relied on Cloudflare Pages preview deploys instead of a true staging environment — documented in ADR-0022, but a real staging would have caught a couple of cross-origin issues earlier.

**Lessons for future course projects:**
- Write ADRs in the same PR as the decision, not "later." Empty placeholders become invisible debt.
- Bake CHANGELOG updates into the release-tag workflow so it never lags releases.
- Capture standups and TA meetings as you go — backfilling at the end is fine, but doing it weekly is cheaper.
- Pick one e2e tool early and land a single happy-path test in Sprint 2, even before you have features to cover. Adding the framework when you "need" it never quite happens.
- Sequence cross-team cutovers by dependency, not by readiness: ship the consumer-side change before (or with) the server change that breaks it.
- Vanilla JS + Cloudflare was the right stack for the constraint and the scale; we never wished for a framework.

**Closing notes:**
- This is the final sprint of the project; the next "sprint" for future maintainers begins with the open items in ADR-0020 (retention cron implementation), ADR-0021 (rate limiter implementation), and broadening the e2e suite beyond the happy paths landed in PR #164.