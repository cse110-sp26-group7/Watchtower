# Changelog

All notable changes to WatchTower are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html)
under the bump rules documented in [ADR-0017](docs/adr/0017-conventional-commits-and-changelog.md).

## [Unreleased]

### Added
- ADR-0019 (Chart.js for dashboard viz), ADR-0020 (30-day retention pruning),
  ADR-0021 (ingest rate limiting), ADR-0022 (no staging environment).
- Backfilled ADR-0001 (Cloudflare platform), ADR-0003 (vanilla JS dashboard),
  and ADR-0004 (single events table) — previously placeholders.

## [0.0.6] - 2026-06-03 — `updateAuth`

### Added
- `POST /api/login` with PBKDF2 password verification and a signed session cookie (#147).
- `POST /api/logout` clears the session cookie and deletes the session row.
- Session-cookie middleware gates every `/api/*` endpoint except `/api/login`;
  credentialed CORS pinned to the dashboard origin.
- `users` and `sessions` tables seeded by migration `0003_auth.sql`; demo user
  hash corrected by `0005_fix_demo_hash.sql`.

### Changed
- `/api/summary` is now routed through the auth gate (#152).

### Fixed
- Guard against undefined signing secret crashing the Worker; added regression
  tests for the auth path.

## [0.0.5] - 2026-06-01 — `updateD1RemoveWedemo`

### Changed
- Consolidated demo project to a single `wt_demo` project_id; updated deploy
  hook and frontend defaults to match (#143, #145).
- Dashboard error log and summary windows expanded from 7 days to 30 days
  to match the retention policy (ADR-0020).

### Fixed
- Frontend pages now consume real API responses end-to-end; mock data paths
  removed (#137).

## [0.0.4] - 2026-05-31 — `addDeployHook`

### Added
- GitHub Actions deploy job that POSTs a deploy event to `/ingest` after a
  successful production deploy, so WatchTower observes its own deploys
  (deploy-event correlation on the dashboard).
- Frontend API client module for communicating with `/api/*` (#131).
- Error log page wired to mock data with type filter and search (#136).

## [0.0.3] - 2026-05-29 — `updateD1`

### Added
- `projects` table (`db/migrations/0002_projects.sql`) and project_id lookup
  on ingest, validated against the projects table.
- SDK unit tests covering page-load and event-flush paths.
- CLI test scaffolding.

### Changed
- SDK no longer tracks an opaque `session_id`; events are correlated by
  project + timestamp only.
- CLI design updated to match the current implementation; added `login`
  and `logout` commands.

## [0.0.2] - 2026-05-27 — `test`

### Fixed
- Deploy workflow now reads `CLOUDFLARE_API_TOKEN` from the `TOKEN_CICD_V1`
  secret; previous run failed because the secret name was wrong (#121).

## [0.0.1] - 2026-05-25 — `test`

### Added
- Initial production-shaped release.
- Two-Worker backend split: `workers/ingest` (POST /ingest) and `workers/api`
  (GET /api/events, GET /api/summary) — see ADR-0009.
- Cloudflare D1 storage with `events` schema (`db/migrations/0001_events.sql`)
  and `(project_id, timestamp DESC)` / `(project_id, event_type, timestamp DESC)`
  indexes — see ADR-0004.
- Dashboard SPA on Cloudflare Pages (vanilla JS, hash routing, Chart.js viz)
  — see ADR-0003 and ADR-0019.
- Client SDK `client/watchtower.js` distributed via jsDelivr CDN
  (`watchtower.min.js`) — see ADR-0007 and ADR-0016.
- CI matrix per Worker (lint + unit tests) on every PR — see ADR-0018.
- Tag-triggered deploy workflow that applies D1 migrations and rolls out
  ingest + api Workers — see ADR-0010.
- ESLint flat config at the repo root — see ADR-0013.
- Conventional Commits convention and Keep-a-Changelog format
  — see ADR-0017.
- Project selection page (#99).
- `GET /api/events` with keyset pagination.
- Smoke-test script (`smoke.sh`) for endpoint round-trips.

[Unreleased]: https://github.com/cse110-sp26-group7/Watchtower/compare/v0.0.6-updateAuth...HEAD
[0.0.6]: https://github.com/cse110-sp26-group7/Watchtower/compare/v0.0.5-updateD1RemoveWedemo...v0.0.6-updateAuth
[0.0.5]: https://github.com/cse110-sp26-group7/Watchtower/compare/v0.0.4-addDeployHook...v0.0.5-updateD1RemoveWedemo
[0.0.4]: https://github.com/cse110-sp26-group7/Watchtower/compare/v0.0.3-updateD1...v0.0.4-addDeployHook
[0.0.3]: https://github.com/cse110-sp26-group7/Watchtower/compare/v0.0.2-test...v0.0.3-updateD1
[0.0.2]: https://github.com/cse110-sp26-group7/Watchtower/compare/v0.0.1-test...v0.0.2-test
[0.0.1]: https://github.com/cse110-sp26-group7/Watchtower/releases/tag/v0.0.1-test
