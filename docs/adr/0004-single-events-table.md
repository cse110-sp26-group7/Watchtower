# ADR-0004: One Polymorphic `events` Table for Errors, Performance, Feedback, Deploys, and Pageviews

## Status
Accepted

## Date
2026-05-06

## Context

The ingest Worker (`POST /ingest`) accepts five event types from instrumented clients and CI:

- **error** — uncaught exceptions and unhandled rejections (`message`, `stack`, `url`, `line`, `col`, `user_agent`).
- **performance** — Core Web Vitals samples (LCP, INP, CLS) and basic navigation timing.
- **feedback** — a rating widget submission (`rating`, `comment`, optional `url`).
- **deploy** — a deployment marker from GitHub Actions (`commit_sha`, `environment`, `actor`).
- **pageview** — a SPA navigation sample, used to give performance and error rates a denominator.

The five types share a substantial envelope: `event_id`, `project_id`, `event_type`, `timestamp`, `environment`, optional `deploy_id`, plus server-side `received_at` and `country`. They diverge in their *payload* — the message/stack of an error has nothing in common with the LCP/INP/CLS of a performance sample.

The dashboard's three biggest queries cut across types — "errors in the last 7 days for project X grouped by message", "p95 LCP for the last 24 hours bucketed by hour", "feedback ratings in the last week" — but they also share one filter shape: `WHERE project_id = ? AND timestamp >= ? AND event_type = ?`. The schema decision is: do we honor the divergent payload by giving each type its own table, or do we honor the shared envelope by giving them one table?

Three options were on the table:

1. **One row per type, one column per field** — five tables (`errors`, `performance`, `feedback`, `deploys`, `pageviews`), each with its own schema, fully typed columns, and its own CRUD path.
2. **One `events` table with a JSON `payload` column** — single envelope row, type discriminated by `event_type`, type-specific fields living inside a `payload TEXT NOT NULL` column we parse with SQLite's JSON1 functions.
3. **An EAV/attribute-bag table** — one row per attribute. Maximally flexible, miserable to query.

## Decision

**One `events` table. Common fields are real columns. Type-specific fields live in a JSON `payload` column.**

The shipped schema is in `db/migrations/0001_events.sql`:

```sql
CREATE TABLE events (
    event_id    TEXT PRIMARY KEY,
    project_id  TEXT NOT NULL,
    event_type  TEXT NOT NULL CHECK (event_type IN ('error','performance','feedback','deploy','pageview')),
    timestamp   TEXT NOT NULL,
    environment TEXT NOT NULL CHECK (environment IN ('dev','staging','prod')),
    deploy_id   TEXT,
    received_at TEXT NOT NULL,
    country     TEXT,
    payload     TEXT NOT NULL
);

CREATE INDEX idx_events_project_ts      ON events (project_id, timestamp DESC, event_id);
CREATE INDEX idx_events_project_type_ts ON events (project_id, event_type, timestamp DESC, event_id);
```

`payload` is a JSON document whose shape is fixed per `event_type` and documented in `docs/backend/api/event-schema-draft.md`. Queries into the payload use SQLite's `json_extract(payload, '$.field')`.

Deploys are stored both in `events` (for the timeline view on the dashboard) and conceptually treated as a separate entity for correlation joins; the current schema reads deploy attribution from `events.deploy_id` rather than maintaining a second `deploys` table. This is a deliberate simplification.

## Consequences

### Positive
- **One ingest code path.** The Worker validates the envelope, picks the right `payload` schema based on `event_type`, and writes one row. There is no `if (type === 'error') insertErrorRow(); else if (type === 'performance') ...` chain in the hot path.
- **One read code path.** The dashboard's `GET /api/events?type=error&since=...` filters by `event_type` on the same indexed query that serves performance and feedback. No per-type API handler.
- **Indexes work for every type.** `(project_id, timestamp DESC)` and `(project_id, event_type, timestamp DESC)` cover the three big dashboard queries. We don't need to maintain a parallel index strategy across five tables.
- **Adding a new event type is a single line.** Extend the `CHECK` constraint, document the payload shape in `event-schema-draft.md`, ship. No migration to add a table, an index, and a CRUD path.
- **Schema flexibility for new payload fields.** Adding a new field to error events (`source_map_id`?) is a documentation change and an ingest validator change. Zero `ALTER TABLE`.
- **D1's SQLite engine has first-class JSON support** (`json_extract`, `json_valid`), so querying into the payload when we need to is a built-in, not a library.
- **30-day retention pruning is one statement for all types** (`DELETE WHERE timestamp < ?`) — see ADR-0020.

### Negative
- **`payload` is not type-checked at the database level.** A bug in the ingest validator could land a malformed payload and only the consuming code would notice. Mitigated by validating every payload against its per-type schema in the Worker before insert.
- **Rows are slightly wider on average** because we store the JSON envelope's bracket/quote overhead. At our scale (events under 2 KB, well under 30 days of retention) this does not threaten the 10 GB D1 cap.
- **Some queries are clumsier.** Filtering "errors whose message contains X" is `WHERE event_type = 'error' AND json_extract(payload, '$.message') LIKE '%X%'` instead of `WHERE message LIKE '%X%'`. We accept this because it isn't on the dashboard's hot path.
- **Indexes can't easily cover payload fields** without virtual columns. If we later need to index "all errors with `error_class = TypeError`" we'd add a generated column. Not needed in v1.
- **Migrating to a per-type schema later is real work** — one row per type with all-fields-in-payload is harder to split into multiple tables than the reverse. We accept the migration cost because we don't expect to need to.

### Out of Scope
- Splitting `deploys` into its own table. The ARCHITECTURE doc still calls out a logical `deploys` table; the shipped schema folds it into `events` with `event_type = 'deploy'`. If correlation queries grow more complex, a materialized `deploys` view is the lowest-cost upgrade.
- Per-project sharding (one D1 database per project). Considered in ADR-0002; deferred unless write contention bites.
- Full-text search over error messages. SQLite FTS5 would slot in as a separate virtual table; not needed for v1.
- Generated/virtual columns to index payload fields. Add only when a real query forces it.

## More Information

- Schema: `db/migrations/0001_events.sql` (shipped).
- Payload shapes per type: `docs/backend/api/event-schema-draft.md`.
- Related: ADR-0002 (D1 + JSON1), ADR-0009 (two-worker split — both read this table), ADR-0020 (retention pruning leans on the single-table shape).
- Architecture: `docs/ARCHITECTURE.md` §3.3 — "Storage — Cloudflare D1".
