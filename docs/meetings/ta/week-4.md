# TA Meeting — Week 4 (2026-05-28)

**TA:** Audria
**Attendees from team:** Kareem, Theo, Bishal, Nhan
**Format:** Zoom, ~30 min

## Agenda

- Sprint 4 status — real-data wiring, summary endpoint, auth design.
- Team 9 peer-review feedback.
- ADR backfill plan.
- Deploy hook for "which deploy caused the fire?" feature.

## Notes

- Audria reviewed Team 9's feedback with us: the main repeat criticism was the four blank ADRs (0001, 0003, 0004, 0005). We agreed to backfill in Sprint 5.
- She liked the deploy-event hook idea (CI POSTs a deploy marker to `/ingest`) — dogfooding our own correlation feature.
- Talked through the auth design (signed cookie vs bearer token). Audria agreed cookie was the right call given the XSS surface on the dashboard.
- Reminded us the rubric weights `docs/devops/` heavily — onboarding, rollback, secrets rotation.
- Asked us to schedule the prof meeting before week 10.

## Action items

- [x] **Theo / Bishal** — Land auth and session middleware in Sprint 4 → Sprint 5.
- [x] **Nhan** — Document secrets management in `docs/devops/` (#150).
- [x] **Michael / Kareem** — Backfill ADRs 0001, 0003, 0004 in Sprint 5.
- [x] **Kareem** — Schedule prof meeting for week 10.
