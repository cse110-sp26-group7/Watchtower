# Sprint 4

- **Start date:** 2026-05-25
- **End date:** 2026-06-01
- **Sprint Goal:** Layer on user-facing features and polish the MVP into a more complete product.

---

## Goals

- [X] Implement CLI deploy
- [ ] FE dashboard connected to real BE data (no more mock data) - Move to Sprint 4
- [ ] Real errors from Test App are visible on the dashboard  - Move to sprint 3
- [ ] Log Viewer functional with real data and search by type - Move to Sprint 4
- [ ] Basic Data Visualizer charts showing real error frequency - Move to Sprint 4
- [ ] QA executes test plan against the fully connected system - Move to Sprint 4
- [ ] Basic authentication — login page with username and password
- [ ] Frontend + Backend second meeting
- [ ] Code review for Team 9
- [ ] Writting ADR

# Move to later Sprint 4 - possibly to Sprint 5
- [ ] Alert and notification system when new errors are detected - Move to later sprint 4, potentially move to sprint 5
- [ ] Summary health view — "Is the site up? Is it throwing errors? Is it performing well?" - Move to later sprint 4, potentially move to sprint 5
- [ ] Deploy signal tracking visible alongside error timeline 
- [ ] UI polish and bug fixes from Sprint 3 retrospective
- [ ] QA regression testing on all Sprint 3 + Sprint 4 features

---

## Sprint Backlog

### User Stories

| User Story | GitHub Issue | Priority | Status |
|---|---|---|---|
| [Basic Alert](https://github.com/cse110-sp26-group7/Watchtower/blob/main/docs/stories/alerts.md) | [N/A]() | High | Not Started |
| [Track Crashes Over Time](https://github.com/cse110-sp26-group7/Watchtower/blob/main/docs/stories/crashes-over-time.md) | [N/A]() | High | Not Started |
| [Summary View](https://github.com/cse110-sp26-group7/Watchtower/blob/main/docs/stories/summary-view.md) | [N/A]() | High | Not Started |
| [Deploy Signal Tracking](https://github.com/cse110-sp26-group7/Watchtower/blob/main/docs/stories/log-viewer.md) | [N/A]() | Medium | Not Started |
| [User Feedback & Ratings](https://github.com/cse110-sp26-group7/Watchtower/blob/main/docs/stories/data-collection.md) | [N/A]() | Medium | Not Started |

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
| Deploy events appear alongside error timeline | Tester triggers a deploy event and confirms it is visible next to error history | Not Ready |
| QA regression pass confirms Sprint 3 features still work | QA runs full regression and documents results | Not Ready |

---

## Dependencies & Risks

| Dependency | Teams Involved | Status |
|---|---|---|
| Sprint 3 MVP must be stable before Sprint 4 features are layered on | All Teams | Unresolved |
| Authentication must be in place before QA can test user-specific views | FE + BE → QA | Unresolved |
| Alert system requires BE to support notification triggers | FE → BE | Unresolved |
| Deploy signal tracking requires GitHub Actions to post deploy events to ingest Worker | DevOps → BE | Unresolved |

---

## Notes & Decisions

- Authentication is lightweight — username and password only, no OAuth or role management
- Silence notification means per-error silencing, not global mute
- Summary health view replaces "pure charts" focus per professor feedback
- Auto-create GitHub issues and DDoS detection are out of scope for this sprint
- General Tasks and Sprint Board to be filled at Sprint 4 planning meeting

---

## Retrospective _(fill at end of sprint)_

**What went well:**
-

**What didn't go well:**
-

**What to improve next sprint:**
-