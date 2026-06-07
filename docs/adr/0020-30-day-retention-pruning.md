# ADR-0020: 30-Day Event Retention via Scheduled D1 `DELETE`

## Status
Proposed

## Date
2026-06-04

## Context

ADR-0002 picked D1 partly on the strength of a 30-day retention policy: keep events in scope, stay under the 10 GB per-database cap, stay under the 100 K daily-write free-tier headroom, and avoid the failure mode where one busy customer fills the database during a long weekend. ADR-0002 deferred the *mechanism* to a separate ADR. This is that ADR.

The shape of the workload makes the decision simple. The `events` table is append-mostly. Every row has an indexed `timestamp` column (ADR-0004). Deleting old rows in time order matches the existing `(project_id, timestamp DESC)` index. We do not need a tombstoning system, soft-delete columns, or a parallel archive — events older than 30 days are gone.

Options considered:

1. **Workers Cron Trigger → scheduled `DELETE` against D1** — schedule a Worker handler that runs every N hours and deletes rows older than 30 days.
2. **Delete-on-read** — when ingest writes a row, opportunistically delete one expired row. Avoids a scheduled job at the cost of tying writes to deletes.
3. **Manual ad-hoc pruning** — a maintainer runs `wrangler d1 execute` by hand when storage gets close to the cap.
4. **No retention** — let the table grow until D1 throttles us, then react.

## Decision

**A Workers Cron Trigger runs once per day at 04:00 UTC and executes `DELETE FROM events WHERE timestamp < datetime('now','-30 days')` against the shared D1 database.**

Implementation notes:

- The cron handler lives in `workers/ingest/` (closest to the data; ingest already owns writes). It runs in batches of at most 10 000 rows per statement to stay well inside Worker CPU limits and D1's per-query bounds.
- The handler logs a structured row to a `retention_runs` table (`run_id`, `started_at`, `finished_at`, `rows_deleted`, `error`) so we can see whether yesterday's run worked without watching it live. Schema TBD when the cron handler is implemented; no migration ships with this ADR.
- The 30-day window applies uniformly to all `event_type` values. Deploy markers do age out, which we accept: deploy correlation is a near-real-time use case, not a long-term audit log.
- The schedule is documented in `wrangler.jsonc` and surfaced in `docs/devops/`.

## Consequences

### Positive
- **Bounds storage by construction.** Worst-case table size becomes a function of daily ingest rate, not project lifetime.
- **One statement, one job, one schedule.** No moving parts.
- **The polymorphic `events` table (ADR-0004) makes this trivial** — one query handles every type.
- **`(project_id, timestamp DESC)` index** already supports the range scan; no new index required.
- **Audit row per run** lets us detect a silently failing job without watching the dashboard.

### Negative
- **D1 deletes count against the daily 100 K write quota.** Steady-state pruning is bounded by the steady-state ingest rate, so we are not at risk under normal load — but a backlog (e.g., the cron job fails for a week and then catches up) could spike write usage. The batching cap mitigates this.
- **Cron schedule drift.** Cron Triggers fire approximately, not exactly, on time. The job is idempotent (no row can be deleted twice) so drift is harmless.
- **Hard cutoff, no grace period.** A user looking at a 30-day-old error at second 59 will see it disappear at second 0. Acceptable for an MVP; revisit if real users hit this.
- **No tombstoning or soft-delete.** Deleted rows are gone. A bug in the cutoff calculation could destroy real data. Mitigated by D1's Time Travel (point-in-time recovery within 30 days).

### Out of Scope
- Per-project retention overrides. v1 is one global window.
- Tiered storage (move expired rows to R2 instead of deleting). Adds operational surface area we don't need yet.
- Real-time TTL on insert (D1 has no native TTL). The scheduled batch is the substitute.
- Alerting if a cron run fails. Add when we have any alerting at all.

## More Information

- Schema: `db/migrations/0001_events.sql`.
- Related: ADR-0002 (deferred this mechanism), ADR-0004 (single-table shape makes pruning a one-liner), ADR-0021 (ingest rate limiting bounds the source of new rows).
- D1 Time Travel: <https://developers.cloudflare.com/d1/best-practices/time-travel/>
- Workers Cron Triggers: <https://developers.cloudflare.com/workers/configuration/cron-triggers/>
