# Sprint 3

- **Start date:** 2026-05-18
- **End date:** 2026-05-25
- **Sprint Goal:** Connect all blocks from Sprint 2 and ship a working MVP — a developer can open WatchTower and see real data end to end.

---

## Goals

- [ ] FE dashboard connected to real BE data (no more mock data)
- [ ] Real errors from Test App are visible on the dashboard
- [ ] Log Viewer functional with real data and search by type
- [ ] Basic Data Visualizer charts showing real error frequency
- [ ] QA executes test plan against the fully connected system
- [ ] Video updating current status of the team.

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

---

## Definition of Done

| Criterion | Verification Method | Progress |
|---|---|---|
| FE dashboard displays real errors from Test App | Tester opens dashboard and confirms real errors from Test App are visible | Not Ready |
| Log Viewer shows real logs and search by type works | Tester searches by error type and confirms only matching logs appear | Not Ready |
| Basic error frequency chart displays real data | Tester confirms chart updates after errors are triggered from Test App | Not Ready |
| Full end to end flow works: Test App → BE → FE | QA runs through complete flow and confirms data appears correctly on dashboard | Not Ready |
| All Sprint 3 bugs reported by QA are resolved or documented | SM reviews QA report and confirms blockers are addressed | Not Ready |

---

## Dependencies & Risks

| Dependency | Teams Involved | Status |
|---|---|---|
| Sprint 2 must be fully complete before integration begins | All Teams | Unresolved |
| FE and BE must verify API contract matches before connecting | FE → BE | Unresolved |
| Test App must be confirmed sending real data before QA testing begins | DevOps → QA | Unresolved |
| Integration debugging may take longer than expected — 2 day buffer built in | FE + BE | Unresolved |

---

## Notes & Decisions

- Sprint 3 is MVP sprint — scope is limited to Data Collection, Log Viewer, and basic Data Visualizer
- Alerts, Notifications, Authentication, and Deploy Signal Tracking are deferred to Sprint 4
- General Tasks and Sprint Board to be filled once Sprint 2 wraps and issues are created
- We have to have a video showcasing our progress by Thursday
- Jack worked on CI/CD pipeline
- Thy made the frontend layout and router
- Bishal worked on watchtower SDK, tracks page views, events
- Cindy worked on frontend as well
- Michael is updating the README and making an ADR for the SDK integration, will have merges up today
- Theo finished /ingest endpoint prototype and schema test, fixed some bugs, will open PR today
- Johnny will work on error logs and will work with backend on connecting everything 
- Ethan finished cli scaffold and started cloudflare migration
- Aarnav and Benny were planning QA and will meet with TA today to discuss
- We will not change the schema
- Ethan, Theo, and Kareem need to review Gabby's PR
- Video just needs to showcase what we have
- **Goal**: working prototype by Wednesday evening
- Need an ADR for distribution 

---

## Retrospective _(fill at end of sprint)_

**What went well:**
-

**What didn't go well:**
-

**What to improve next sprint:**
-
