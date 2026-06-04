# Sprint 4

- **Start date:** 2026-05-25
- **End date:** 2026-06-01
- **Sprint Goal:** Layer on user-facing features and polish the MVP into a more complete product.

---

## Goals

- [X] Implement CLI deploy
- [X] FE dashboard connected to real BE data (no more mock data) 
- [X] Real errors from Test App are visible on the dashboard 
- [X] Log Viewer functional with real data and search by type 
- [X] Basic Data Visualizer charts showing real error frequency
- [ ] QA executes test plan against the fully connected system  - moved to Sprint 5
- [ ] Basic authentication — login page with username and password - moved to Sprint 5
- [X] Frontend + Backend second meeting
- [X] Code review for Team 9
- [X] Writting ADR

# Move to later Sprint 4 - possibly to Sprint 5
- [ ] Alert and notification system when new errors are detected - Move to later sprint 4, potentially move to sprint 5
- [ ] Summary health view — "Is the site up? Is it throwing errors? Is it performing well?" - Move to later sprint 4, potentially move to sprint 5
- [X] Deploy signal tracking visible alongside error timeline 
- [X] UI polish and bug fixes from Sprint 3 retrospective
- [ ] QA regression testing on all Sprint 3 + Sprint 4 features

---

## Sprint Backlog

### User Stories

| User Story | GitHub Issue | Priority | Status |
|---|---|---|---|
| Basic Alert | N/A | High | Sprint 5 - but in low priority |
| Track Crashes Over Time | N/A | High | Sprint 5 - but in low priority |
| Summary View | N/A | High | In Progress |
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
| Login page works with username and password | Tester confirms they can log in and are blocked without credentials | Not Ready |
| Alert triggers when a new error is detected | Tester triggers an error and confirms alert appears without manually refreshing | Not Ready |
| Alert can be silenced after acknowledgement | Tester confirms silenced alert does not reappear for the same error | Not Ready |
| Summary health view displays site status clearly | Tester confirms view answers: is site up, any errors, any performance issues | Not Ready |
| Deploy events appear alongside error timeline | Tester triggers a deploy event and confirms it is visible next to error history | Done |
| QA regression pass confirms Sprint 3 features still work | QA runs full regression and documents results | Not Ready |

---

## Dependencies & Risks

| Dependency | Teams Involved | Status |
|---|---|---|
| Sprint 3 MVP must be stable before Sprint 4 features are layered on | All Teams | Most sprints from sprint 3 were moved to Sprint 4 |
| Authentication must be in place before QA can test user-specific views | FE + BE → QA | BE team is in progress |
| Alert system requires BE to support notification triggers | FE → BE | Could be moved to next speint |
| Deploy signal tracking requires GitHub Actions to post deploy events to ingest Worker | DevOps → BE | DOne |

---

## Notes & Decisions

- Authentication is lightweight — username and password only, no OAuth or role management
- Silence notification means per-error silencing, not global mute
- Summary health view replaces "pure charts" focus per professor feedback
- Auto-create GitHub issues and DDoS detection are out of scope for this sprint
- General Tasks and Sprint Board to be filled at Sprint 4 planning meeting 
- Backend and QA are connected now 
- Goals:
    - Authentication
    - Frontend and backend team discuss on how to connect the two together
        - Notifications, alerts → pushed back for now, focus on other edge cases later 
    - FE BE QA team workflow is automated
- Come up with a different name for WatchTower
- Repo review Team 9's project

---

## Retrospective _(fill at end of sprint)_

**What went well:**
- We had a lot of features implemented
- Discussed our progress during each meeting
- Active in pull reviews

**What didn't go well:**
- Communication across the teams; teams got a little bit out of sync

**What to improve next sprint:**
- Add jsdocs to files