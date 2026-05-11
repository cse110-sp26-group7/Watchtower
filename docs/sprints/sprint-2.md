# Sprint 2

- **Start date:** 2026-05-11
- **End date:** 2026-05-18
- **Sprint Goal:** Have a simple working product on every team — data flowing from Test App to BE, and FE displaying real errors.

---

## Goals

- [ ] FE delivers working dashboard shell with mock data
- [ ] BE has minimal API endpoints ready (connection to FE in Sprint 3)
- [ ] Test App has SDK installed (data sending confirmed in Sprint 3)
- [ ] CI pipeline set up (stretch goal)
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

---

## Definition of Done

| Criterion | Verification Method | Progress |
|---|---|---|
|FE dashboard shell is built and displays mock data correctly| Tester opens dashboard and confirms UI renders with mock data | Not Ready |
|BE has at least one working API endpoint returning real data| BE team demos a successful API response in isolation | Not Ready |
|SDK is installed on Test App | Ethan confirms SDK is running on the site | Not Ready |
|QA test plan is written and reviewed| SM reviews and approves test plan doc | Not Ready |

---

## Dependencies & Risks

| Dependency | Teams Involved | Status |
|---|---|---|
| QA and BE must agree on data format before any integration work begins | QA → BE | Unresolved |
| FE is blocked until BE has at least one working API endpoint to connect to | FE → BE | Deferred — FE building on mock data until Sprint 3 integration |
| DevOps cannot be setup correctly without Tests from QA | QA → DevOps | Unresolved |

---

## Notes & Decisions

- Test App is Ethan's club website — not a custom-built app
- WatchTower SDK must be installed on Test App to send data to ingest Worker
- WatchTower only observes client side and deployment info — not the Test App's backend
- DevOps focus this sprint is split: Ethan on SDK + Test App connection, Nhan on CI pipeline

---

## Retrospective _(fill at end of sprint)_

**What went well:**
-

**What didn't go well:**
-

**What to improve next sprint:**
-