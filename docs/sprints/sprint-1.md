# Sprint [N]

- **Start date:** 2026-05-04
- **End date:** 2026-05-11
- **Sprint Goal:** Understand the WatchTower and Come up with Plans

---

## Goals

- [X] Core Features Discussion and Final Decisions
- [X] Repo setup and Finalize Architecture Design
- [X] CloudFlare simple Setup - including 2 Workers and Database D1
- [X] Discussion and Plan to hook Customer App with our Backend

---

## Sprint Backlog

### User Stories

| User Story | GitHub Issue | Priority | Status |
|---|---|---|---|
| [Data Collection](https://github.com/cse110-sp26-group7/Watchtower/blob/main/docs/stories/data-collection.md) | [#04](https://github.com/cse110-sp26-group7/Watchtower/issues/4) | High | Done |
| [Log Viewer](https://github.com/cse110-sp26-group7/Watchtower/blob/main/docs/stories/log-viewer.md) | [#05](https://github.com/cse110-sp26-group7/Watchtower/issues/5) | High | Done |
| [Data Visualizer](https://github.com/cse110-sp26-group7/Watchtower/blob/main/docs/stories/data-visualizer.md) | [#06](https://github.com/cse110-sp26-group7/Watchtower/issues/6) | High | Done |

### General Tasks

| Task | Team | GitHub Issue | Priority | Status |
|---|---|---|---|---|
| Domain Research | Everyone | [#03](https://github.com/cse110-sp26-group7/Watchtower/issues/3) | High | Done | 
| Discuss how BE & FE work together | FE / BE | [#22](https://github.com/cse110-sp26-group7/Watchtower/issues/22) | High | Done |
| Plan on Test App | DevOps / BE | [#23](https://github.com/cse110-sp26-group7/Watchtower/issues/23) | High | Done |
| Dedicated Technical Meeting | All Team | [N/A]() | High | Done |


---

## Sprint Board

| Name/Team | Task | GitHub Issue | Doc Link | Expected Finish |
|---|---|---|---|---|
| Kareem | Setup Repo | [#02](https://github.com/cse110-sp26-group7/Watchtower/issues/2) | [N/A](link) | 05-06 |
| Kareem | Design Architecture with detail documentation, using UML diagram | [#17](https://github.com/cse110-sp26-group7/Watchtower/issues/17) | [Doc & UML Diagram](https://github.com/cse110-sp26-group7/Watchtower/blob/main/docs/ARCHITECTURE.md) | 05-07 |
| Frontend | Final Decision on Core Features | [#18](https://github.com/cse110-sp26-group7/Watchtower/issues/18) | [Final Decision](https://docs.google.com/document/d/1MgYr_m3W-J6pZHrG1e2hDYOwtct2ct4T-Xzj8ATxadQ/edit?tab=t.tbllxxbm1enz) | 05-07 |
| Theo | Set up Sprint 1 Backlog for BE team And Scaffold docs/backend | [#07](https://github.com/cse110-sp26-group7/Watchtower/pull/7) | [link](https://github.com/cse110-sp26-group7/Watchtower/blob/main/docs/backend/backlogs/sprint-1.md) | 05-07 |
| Michael | Update Sprint 1 for BE team | [#08](https://github.com/cse110-sp26-group7/Watchtower/pull/8) | [N/A]() | 05-07 |
| Backend Team | Research on technologies and TestApp Connection | [#09](https://github.com/cse110-sp26-group7/Watchtower/pull/9) | [backend-research.md](https://github.com/cse110-sp26-group7/Watchtower/blob/main/docs/backend/research/backend-research.md) | 05-08 |
| Gabrielle | Storage Selection | [#19](https://github.com/cse110-sp26-group7/Watchtower/issues/19) | [0002 — Storage Selection for WatchTower Backend](https://github.com/cse110-sp26-group7/Watchtower/blob/main/docs/adr/0002-d1-over-kv-or-external-postgres.md) | 05-08 |
| Bishal | Observability SDK Research | [N/A]() | [N/A]() | 05-08 |
| Michael | Observability SDK Research | [#14](https://github.com/cse110-sp26-group7/Watchtower/pull/14) | [backend-research.md](https://github.com/cse110-sp26-group7/Watchtower/blob/main/docs/backend/research/backend-research.md)| 05-08 |
| Theo | Event schema + api draft | [#16](https://github.com/cse110-sp26-group7/Watchtower/issues/16) | [event-schema-draft.md](https://github.com/cse110-sp26-group7/Watchtower/blob/main/docs/backend/api/event-schema-draft.md) | 05-08 |
| Thy | FE wireframe and brief design | [#20](https://github.com/cse110-sp26-group7/Watchtower/issues/20) | [Doc & Micro](https://docs.google.com/document/d/1COGC7VEa5QKQ8ZzEpXKHkxnwunBl5c1GCVo-GVRcX-k/edit?tab=t.tkvl21e6j2oc) | 05-08 |
| Nhan | Main Branch Protection Enforcing PR & Reviewer | [#28](https://github.com/cse110-sp26-group7/Watchtower/issues/28) | [N/A]() | 05-08 |
| Gabrielle | Added cloudlfare worker dev environment | [#21](https://github.com/cse110-sp26-group7/Watchtower/pull/21) | [N/A]() | 05-08 | 
| Nhan | Wire D1 database binding for ingest worker | [#32](https://github.com/cse110-sp26-group7/Watchtower/pull/32) | [N/A]() | 05-08 |
| Michael | Implemented schema.sql and updated event-schema-draft.md | [#43](https://github.com/cse110-sp26-group7/Watchtower/pull/43) | [N/A]() | 05-09 |
---

## Definition of Done

| Criterion | Verification Method | Progress |
|---|---|---|
| Repo Creation | All Lead Review (backend, frontend,...) | Done |
| Features plan | Repo Lead makes sure all issues are created in Github Project | Done |
| Coding Decision | Tech Lead creates UML as an instruction file that other dev can look back at. Repo Lead makes sure it is written nicely, easy to read. | Done |

---

## Dependencies & Risks

| Dependency | Teams Involved | Status |
|---|---|---|
| Tech lead need to finish Architecture desgin as soon as possible | All team | Resolved
| FE need to finalize design so BE team knows what API/data will be served to client side | FE -> BE | Resolved |

---

## Notes & Decisions

- No creating our own Test App, will test on other. Ethan volunteer to use his club's website.
- Test App have to download our SDK to activate watchtower on their tool.
- WatchTower observes the Test App's client side and its deployment info - no watching on their backend.

---

## Retrospective (N/A for this sprint)

**What went well:**
-

**What didn't go well:**
-

**What to improve next sprint:**
-