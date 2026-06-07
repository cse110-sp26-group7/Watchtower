# Sprint 2

- **Start date:** 2026-05-11
- **End date:** 2026-05-18
- **Sprint Goal:** Have a simple working product on every team — data flowing from Test App to BE, and FE displaying real errors.

---

## Goals

- [X] FE delivers working dashboard shell with mock data
- [X] BE has minimal API endpoints ready (connection to FE in Sprint 3)
- [X] Test App has SDK installed (data sending confirmed in Sprint 3)
- [X] CI pipeline set up (stretch goal)
---

## Sprint Backlog

### User Stories

| User Story | GitHub Issue | Priority | Status |
|---|---|---|---|
| [Data Collection](https://github.com/cse110-sp26-group7/Watchtower/blob/main/docs/stories/data-collection.md) | [#04](https://github.com/cse110-sp26-group7/Watchtower/issues/4) | High | In Progress |
| [Log Viewer](https://github.com/cse110-sp26-group7/Watchtower/blob/main/docs/stories/log-viewer.md) | [#05](https://github.com/cse110-sp26-group7/Watchtower/issues/5) | High | In Progress |
| [Data Visualizer](https://github.com/cse110-sp26-group7/Watchtower/blob/main/docs/stories/data-visualizer.md) | [#06](https://github.com/cse110-sp26-group7/Watchtower/issues/6) | High | In Progress |

### General Tasks

| Task | Team | GitHub Issue | Priority | Status |
|---|---|---|---|---|
---

## Sprint Board

| Name/Team | Task | GitHub Issue | Doc Link | Expected Finish |
|---|---|---|---|---|
| FE Team | Start dashboard UI shell (no data needed, just structure) | [#24](https://github.com/cse110-sp26-group7/Watchtower/issues/24) | [N/A]() | 05-18 |
| BE Team | Start API endpoint setup | [#25](https://github.com/cse110-sp26-group7/Watchtower/issues/25) | [N/A]() | 05-15 |
| DevOps | Connection with Test App | [#45](https://github.com/cse110-sp26-group7/Watchtower/issues/45) | [N/A]() | 05-14 |
| QA | Test plan + minimal tests | [#46](https://github.com/cse110-sp26-group7/Watchtower/issues/46) | [N/A]() | 05-16 |
(More in Github Project)
---

## Definition of Done

| Criterion | Verification Method | Progress |
|---|---|---|
|FE dashboard shell is built and displays mock data correctly| Tester opens dashboard and confirms UI renders with mock data | Done |
|BE has at least one working API endpoint returning real data| BE team demos a successful API response in isolation | Done |
|SDK is installed on Test App | Ethan confirms SDK is running on the site | Done |
|QA test plan is written and reviewed| SM reviews and approves test plan doc | Done |

---

## Dependencies & Risks

| Dependency | Teams Involved | Status |
|---|---|---|
| FE is blocked until BE has at least one working API endpoint to connect to | FE → BE | Deferred — FE building on mock data until Sprint 3 integration |
| DevOps cannot be setup correctly without Tests from QA | QA → DevOps | Resolved by including tests from BE code init for now which is good enough for CI/CD for now. |

---

## Notes & Decisions

- Test App is Ethan's club website — not a custom-built app
- WatchTower SDK must be installed on Test App to send data to ingest Worker
- WatchTower only observes client side and deployment info — not the Test App's backend
- DevOps focus this sprint is split: Ethan on SDK + Test App connection, Nhan on CI pipeline

---

## Retrospective _(2026-05-18, end of Sprint 2)_

**What went well:**
- Good communication on Slack `#watchtower-standups`.
- Clear tasks per sub-team — FE shell, BE ingest scaffold, SDK draft, CI baseline.

**What didn't go well:**
- Hard to schedule a full-team meeting; with 13 people there's almost never a clean common slot.

**What to improve next sprint:**
- Lead-to-lead pairing: team leads coordinate, then schedule short pair sessions inside their sub-teams instead of trying to assemble everyone at once.

**Incorporation in Sprint 3:**
- TA meetings deliberately attended by 2–3 people (Kareem + lead per area), not the full team. Documented in `docs/meetings/ta/week-3.md` onward.
- Standups stayed on Slack-async + 25-min Zoom for those who could make it, not full-team blocking meetings (`docs/meetings/standups/sprint-3.md`).
