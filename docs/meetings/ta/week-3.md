# TA Meeting — Week 3 (2026-05-21)

**TA:** Audria
**Attendees from team:** Kareem, Theo, Thy, Johnny (FE)
**Format:** Zoom, ~30 min

## Agenda

- Sprint 3 MVP status — full end-to-end (Test App → SDK → ingest → D1 → API → dashboard).
- Status video for prof's checkpoint.
- ADR coverage check.
- Peer-review pairing with Team 9 (week 9).

## Notes

- Audria saw the live `/ingest` round-trip; happy with the shape.
- Flagged that ADRs 0001, 0003, 0004 were placeholders in the repo. Said it's fine for now but to backfill before peer review.
- Suggested an ADR specifically for SDK distribution (jsDelivr CDN) because it's a load-bearing decision for how customers integrate. ADR-0007 written same day.
- Reminded us that the status video doesn't need to be polished — just demonstrates current state for prof checkpoint.
- Confirmed peer review with Team 9 will be in Sprint 4 / Sprint 5 boundary.

## Action items

- [x] **Bishal** — Write ADR-0007 (jsDelivr) before Sunday.
- [x] **Benny** — Status video v1 by 2026-05-22 (Thursday).
- [x] **Kareem** — Schedule ADR backfill pass for Sprint 4 (now done in Sprint 5).
- [x] **Theo** — `GET /api/events` with pagination by end of sprint.
