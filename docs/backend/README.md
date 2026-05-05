# Backend Documentation

Documentation for the WatchTower backend, owned by the Backend Lead and the backend team.

## Structure

- `adr/` — Architectural Decision Records for the backend area, in MADR format. Used for decisions that have meaningful long-term consequences (storage choice, auth strategy, schema design once stabilized, etc.).
- `api/` — API contracts, including event schemas, endpoint specifications, and design notes.
- `backlogs/` — Per-sprint backend backlogs. Each sprint gets its own file (`sprint-1.md`, `sprint-2.md`, etc.). These are planning artifacts; the live state of each task lives in GitHub Issues.

## Conventions

- ADR files use the format `NNNN-short-slug.md` (e.g., `0001-storage-choice.md`).
- Numbering is local to the backend area. Architecture-wide ADRs owned by the Tech Lead live separately under `docs/adr/`.
