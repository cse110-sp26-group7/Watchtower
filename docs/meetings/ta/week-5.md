# TA Meeting — Week 5 (2026-06-04)

**TA:** Audria
**Attendees from team:** Kareem, Theo, Michael, Thy
**Format:** Zoom, ~30 min

## Agenda

- Sprint 5 status — auth shipped (`v0.0.6-updateAuth`), dashboard polish, doc backfill.
- Demo video plan.
- Final retrospective scheduling.
- Outstanding ADR / CHANGELOG / meeting-notes gaps.

## Notes

- Audria signed off on the shipped MVP shape: login → dashboard → error log → summary → deploy correlation, all behind auth.
- Acknowledged the no-staging risk; said our tag-gate posture is acceptable for the course timeline. Suggested we write an ADR documenting the decision rather than leaving it implicit. → ADR-0022.
- Flagged the empty CHANGELOG and empty ADRs 0001/0003/0004 — said these are the easiest rubric wins to close before final grading.
- Approved process artifacts including retroactive standup / TA-meeting notes provided they reflect work that's verifiable from the repo (PR numbers, commits, sprint goals).
- Confirmed she'll attend final demo on 2026-06-08.

## Action items

- [x] **Michael / Kareem** — Backfill ADRs 0001, 0003, 0004 by 2026-06-05.
- [x] **Kareem** — Populate CHANGELOG from tags by 2026-06-05.
- [x] **Kareem** — Mirror Slack standup history into `docs/meetings/standups/`.
- [x] **Michael** — Add ADRs for Chart.js, retention, rate limiting, no-staging (ADR-0019..0022).
- [ ] **All team** — Sprint 5 retrospective by 2026-06-07.
