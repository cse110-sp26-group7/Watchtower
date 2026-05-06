# 0001 — Storage Selection for WatchTower Backend

- Status: Proposed
- Date: 2026-05-06
- Deciders: Backend team (Theo, Michael, Bishal, Gabrielle)
- Consulted: TA Audria (pending)
- Informed: Full WatchTower team

## Context and Problem Statement

WatchTower is a lightweight observability backend that ingests three kinds of data from instrumented client applications: **events** (thrown errors, performance samples, and user-feedback signals from rating widgets and feedback forms), **releases** (build/deploy markers used to attribute regressions to a specific deployment), and **projects** (the tenants whose software is being watched). The backend must run on Cloudflare Workers per the project's technical constraints, which means our persistence layer must be one of Cloudflare's first-party storage products.

The dashboard surface drives the read-side requirements. End users will routinely ask questions like *"show me all errors for project X in the last 7 days, grouped by message, sorted by count"* or *"show the p95 page-load time for release v1.4.2 over the past 24 hours."* These queries require server-side filtering, sorting, grouping, and time-range scans — they are not point-key lookups. The write side has the opposite shape: high-volume, append-mostly inserts of small JSON-ish payloads, with the realistic worst case being a single busy customer site emitting thousands of events per minute during an incident.

The question this ADR decides: **which Cloudflare storage product (or combination) should hold WatchTower's events, releases, and projects?**

## Decision Drivers

We are evaluating each option against the following criteria, in roughly descending order of importance for this project:

1. **Query capability** — Can the dashboard run filtered, sorted, grouped, and time-range queries directly against the store, or do we have to build a query layer ourselves? This is the single biggest architectural hinge.
2. **Free-tier capacity for an academic-scale project** — The team has no budget. The chosen store must comfortably support our development, testing, demo, and peer-review traffic without forcing us onto the $5/month Workers Paid plan.
3. **Write throughput and burst tolerance** — Events arrive in spikes. The store must absorb a realistic burst (low thousands per minute) without backpressuring the Worker into 5xx responses to instrumented clients.
4. **Schema flexibility** — Event payloads will evolve as we add instrumentation. Adding a new field on Tuesday should not require a migration sprint on Wednesday.
5. **Migration cost out of the chosen product** — Once we lock in a storage product the cost to switch is real. The course explicitly calls out ADRs for major decisions because this lock-in is hard to undo.
6. **Operational simplicity for a four-person team** — None of us has run a database in production before. Backups, schema changes, and recovery should be tractable without a dedicated DBA.
7. **Workers integration and operational glue** — Native bindings, local development story (`wrangler dev`), and observability inside the Cloudflare dashboard reduce time spent on plumbing rather than features.

These drivers are the yardstick. Every option below is measured against them — generic capability claims that don't tie back to one of these are filtered out.

## Considered Options

1. **Cloudflare D1** — serverless SQL database (SQLite engine).
2. **Cloudflare Workers KV** — eventually-consistent global key-value store.
3. **Cloudflare R2** — S3-compatible object storage with zero egress fees.
4. **Cloudflare Durable Objects (SQLite-backed)** — strongly-consistent, single-threaded compute-with-storage primitive; on the Workers Free plan only the SQLite storage backend is available.

## Decision Outcome

**Chosen option: Cloudflare D1**, because it is the only candidate that natively supports the filtered, sorted, time-range, grouped queries the WatchTower dashboard requires (drivers 1, 4), its free-tier daily allowances are the most generous fit for our expected academic-project volume (driver 2), and its operational model — schema migrations via SQL files, point-in-time recovery, dashboard-visible metrics — is the simplest of the four for a team that has never run a database (driver 6).

R2 will be used as a **secondary store** for any large blobs we may later attach to events (stack-trace attachments, source maps), but it is not the primary database. KV and Durable Objects are rejected as the primary store; rationale below.

This decision is **Proposed**, not Accepted, until the bootstrap spike (`spike/cloudflare-bootstrap`) confirms the projected query latencies and the backend team formally signs off on the PR for this ADR.

### Consequences

**Positive**

- The dashboard's required query shapes (date range, GROUP BY, ORDER BY, JOIN across events/releases/projects) translate directly to standard SQL. Anyone on the team who has taken a databases course can read and review them.
- D1 is an SQLite engine, so SQL semantics are exactly the ones documented in the SQLite reference — no dialect surprises. JSON parsing functions and full-text search triggers are supported in the engine, which is useful for searching error messages.
- D1 gives us **Time Travel** (point-in-time restore to any minute within the last 30 days) at no extra cost, which substantially de-risks early-development "we just dropped the wrong table" situations.
- Native Workers binding (`env.DB.prepare(...)`), local emulation in `wrangler dev`, and per-database metrics (rows read, rows written, query latencies) in the Cloudflare dashboard reduce setup work to roughly a single afternoon.
- The free tier's daily reset at 00:00 UTC means a single bad test run can never compound into a multi-day outage of our dev environment.

**Negative**

- D1 free-tier write allowance is **100,000 rows written per day** (resetting at 00:00 UTC). A single sustained event flood from a misconfigured demo client could exhaust that in under a day. We will need basic rate limiting at the ingest Worker (cheap to add; tracked as a separate task).
- Each individual D1 database is **single-threaded** and processes queries sequentially. A 1ms query gives ~1,000 qps; a 100ms query gives ~10 qps. We must keep dashboard queries fast (sub-50ms target) by indexing aggressively on `(project_id, timestamp)` and similar columns.
- Each database is capped at **10 GB**; this is not extendable. At our projected event volume this is years of headroom, but a runaway ingestion bug could fill it during a long weekend.
- D1's backup format is its own (Time Travel + `.sql` dump via `wrangler d1 export`). Migrating *out* of D1 to, say, self-hosted Postgres is straightforward at the dialect level (SQLite → Postgres has well-understood translations) but is a real piece of work, not a flag flip.
- D1 is a relatively young product (GA'd in 2024). Community examples and Stack Overflow density are thinner than for Postgres or MySQL, which slightly increases the cost of debugging unusual behavior.

**Neutral**

- Locking into Cloudflare for the duration of the project is required by the course's technical constraints regardless of which option we pick, so this isn't a real cost of choosing D1 — it would be the same for KV, R2, or Durable Objects.
- The choice does not commit us on the *data model*; ADR-0002 (event schema) will be a separate decision and can evolve independently.

### Confirmation

The decision is confirmed when **all four** of the following are true at the end of the bootstrap spike:

1. The spike branch (`spike/cloudflare-bootstrap`) successfully creates a D1 database, applies the seed schema migration, and round-trips a sample event through ingest → store → dashboard query.
2. With seeded test data of at least 50,000 events across 3 projects, the canonical dashboard query (`errors in last 7 days for project X, grouped by message, sorted by count`) executes in under **200 ms** end-to-end (Worker invocation + D1 query + JSON serialization).
3. A simulated burst of 100 events/second for 60 seconds is ingested without the Worker returning 5xx, and total `rows_written` for the burst stays within a single day's free-tier allowance with margin to spare.
4. At least one other backend team member has reviewed and approved the ADR PR, and TA Audria has signed off in the weekly TA meeting.

If any of these fail, this ADR returns to Draft status and we revisit Durable Objects (SQLite) or a hybrid D1+KV approach in a follow-up ADR.

## Pros and Cons of the Options

> Free-tier figures below are sourced from Cloudflare's official pricing pages and verified as of **2026-05-06**. Cloudflare publishes these limits on a page that does change; before publishing this ADR as Accepted, recheck the linked pricing pages in *More Information*.

### Option 1: Cloudflare D1

A serverless SQL database built on the SQLite engine, with native Worker bindings and a 30-day point-in-time recovery feature ("Time Travel").

**Free-tier limits (2026-05-06):** 5 GB total storage per account, 5,000,000 rows read per day, 100,000 rows written per day. Daily limits reset at 00:00 UTC. Each database is capped at 10 GB; up to 50,000 databases per account.

**Pros**

- **Native filter/sort/group/join queries** via standard SQL (driver 1). The dashboard's hardest read query — `SELECT message, COUNT(*) FROM events WHERE project_id = ? AND ts > ? GROUP BY message ORDER BY 2 DESC` — is one statement, zero application-layer work.
- **Schema flexibility is good enough** (driver 4). New columns are a single `ALTER TABLE`; storing the raw event payload as a JSON column lets us add new fields without any migration at all, and SQLite's JSON functions (`json_extract`, etc.) let us query into it when needed.
- **Generous free-tier daily allowance** for our scale (driver 2). 5M reads/day comfortably covers the dashboard's expected query volume during demos and TA meetings; 100K writes/day covers ~70 events/minute sustained, which is sufficient for development and peer-review week.
- **Operational simplicity** (driver 6): SQL migrations are `.sql` files in the repo, applied with `wrangler d1 migrations apply`. Time Travel covers "we broke prod" recovery for free. Per-database metrics are visible in the Cloudflare dashboard without any extra setup.
- **Best Workers integration** (driver 7): the binding is one line of Wrangler config; queries use the same prepared-statement API in local dev (`wrangler dev`) and in production.

**Cons**

- **Single-threaded per database** (driver 3): one D1 database serializes queries. Worst-case write bursts compete with dashboard reads. We can mitigate by keeping queries indexed and short, and (later, if needed) by sharding events into a per-project database — D1 supports up to 50,000 databases per account at no extra cost.
- **100K rows-written/day cap on free tier** (driver 2/3): a single misconfigured ingest client can exhaust this. We will add basic per-project ingest rate limiting before peer-review week.
- **SQLite-flavored, not Postgres-flavored** (driver 5): if we ever wanted server-side `RETURNING`, native UUID types, or richer window functions, we would not get them. For an MVP observability backend this does not bite.
- **Migration *out* requires real work** (driver 5; full analysis below): D1's Time Travel backups are not a portable Postgres dump.
- **Younger product**: edge cases around concurrent connections or large transactions surface less frequently in community resources than for older databases.

### Option 2: Cloudflare Workers KV

An eventually-consistent global key-value store optimized for read-heavy, infrequently-written data served from edge caches.

**Free-tier limits (2026-05-06):** 100,000 reads per day, 1,000 writes per day, 1,000 deletes per day, 1,000 list operations per day, 1 GB total storage per account. Daily limits reset at 00:00 UTC. Maximum value size is 25 MB; KV is eventually consistent, so a write may take up to ~60 seconds to propagate globally.

**Pros**

- **Excellent global read latency** for already-warm keys (driver 7) — values are cached at every Cloudflare edge POP, which is great for serving project metadata that changes rarely.
- **Schema-free** (driver 4): values are arbitrary blobs, so adding a new field to an event payload requires zero migration ceremony.
- **Operationally trivial** (driver 6): no schema, no migrations, no concept of indexes. The mental model is exactly `Map<string, Buffer>`.
- **Workers binding is first-class** (driver 7), with local emulation in `wrangler dev` and per-namespace metrics in the dashboard.

**Cons**

- **No filter/sort/group queries at all** (driver 1) — this is the disqualifier. KV exposes only `get(key)`, `put(key, value)`, `delete(key)`, and `list({prefix})`. Implementing "errors in last 7 days for project X grouped by message" requires reading every event into the Worker and grouping in JS, which is both slow and bills against the read quota many times over.
- **Free-tier write quota is brutal for events** (driver 2/3): **1,000 writes per day**. WatchTower would burn that allowance in roughly 8 minutes at 2 events/second — well below the "thousands of events per minute" worst case the project brief explicitly calls out.
- **Eventual consistency** (driver 1): reads after writes may return stale data for up to ~60 seconds. The dashboard would routinely lie to users immediately after an event is reported.
- **Migrating off KV is the most expensive of the four options** (driver 5; see below): unstructured data has to be parsed, schematized, and rebuilt into rows in whatever destination we pick.

### Option 3: Cloudflare R2

S3-compatible object storage with zero egress fees, designed for unstructured large-blob data (images, video, archives).

**Free-tier limits (2026-05-06):** 10 GB-month of Standard storage, 1,000,000 Class A operations per month (writes/lists/multipart), 10,000,000 Class B operations per month (reads/HEADs). Free egress (no bandwidth charges, ever). `DeleteObject` and `DeleteBucket` are free operations and don't count against the Class A bucket. Limits reset monthly, not daily.

**Pros**

- **Free egress** (driver 7): if WatchTower ever serves large attachments (e.g., uploaded source maps or screenshots) this matters.
- **Most generous storage allowance of the four** (driver 2): 10 GB of Standard storage on the free tier, with monthly (not daily) operation buckets that are very hard to exhaust at our scale.
- **Schema-free blob storage** (driver 4): R2 doesn't care what's inside an object; appropriate for opaque attachments.
- **Standard S3 API** (driver 5): if we ever migrate, the destination AWS S3 / Backblaze B2 / MinIO is a straight API swap rather than a data-shape rewrite. Migration *cost* is high anyway because we'd have to keep our hand-rolled query layer working — see below.

**Cons**

- **No query capability whatsoever** (driver 1) — also a disqualifier. R2 is blob storage. Filtering "errors in last 7 days for project X" requires us to either (a) build secondary indexes by hand in some other store, or (b) list and re-fetch every object, which is both slow and consumes Class B operations linearly with the data set.
- **Wrong shape for the workload** (driver 3): R2 is not optimized for many small writes. Each event becoming an object would consume Class A operations rapidly and leave us with a folder of millions of tiny files we can't usefully query.
- **No native time-range support** (driver 1): we'd have to encode timestamps into key names and build our own range scan logic. This is exactly the "query layer in application code" anti-pattern.
- **Migrating off R2 means we already built our own query layer**, which becomes the migration burden (driver 5; see below).

### Option 4: Cloudflare Durable Objects (SQLite-backed)

A compute-with-storage primitive: each Durable Object is a single-threaded JavaScript instance with an embedded, zero-latency SQLite database. On the Workers Free plan, only the SQLite-backed flavor is available; the older key-value storage backend is Paid-plan only.

**Free-tier limits (2026-05-06):** 100,000 Durable Object requests per day; SQLite storage of 5 GB per account on Free, 1 GB per individual object. SQL `rows_read` / `rows_written` allowances mirror D1's free-tier quotas (5M reads/day, 100K writes/day). Storage billing for SQLite-backed Durable Objects became enabled on **2026-01-07**.

**Pros**

- **Strong consistency and zero-latency SQL** (driver 1): the SQLite database lives in the same thread as the Worker code, so queries are synchronous and effectively free in latency terms. Excellent for per-tenant, per-room, or per-session state where one logical entity owns its data.
- **Same SQL semantics as D1** (driver 1/4): a SQLite query that runs in D1 runs identically in a Durable Object's SQLite backend. We could share schema files between the two.
- **Per-object isolation makes a per-project shard model trivial** (driver 3): each WatchTower project could be its own Durable Object, side-stepping the "single hot database" concern that D1 has.
- **Point-in-time recovery within the last 30 days** is supported (driver 6), matching D1 Time Travel.

**Cons**

- **Sharding is mandatory, not optional** (driver 6): a Durable Object is a single SQLite database scoped to that object. Cross-project queries — *"give me all errors across all projects in the past hour"* — require either querying every object's DO and merging in the Worker, or maintaining a separate aggregate store. This is genuinely more work than `SELECT ... FROM events` against a single D1 database.
- **Lower-level building block** (driver 6): Cloudflare's own documentation describes Durable Objects as a lower-level compute+storage primitive vs. D1's "batteries-included" managed-database model. We'd be building DBA tooling we get for free with D1.
- **100,000 requests/day free-tier cap** (driver 2): one DO request per ingested event, plus dashboard reads, will burn through this faster than D1's 100K *writes* would, because every query and every event becomes a request even if it's small.
- **Migrating off Durable Objects is the second-most-expensive option** (driver 5; see below): consolidating sharded state across many DOs into a single relational database requires a custom export script.
- **No HTTP API** (driver 7): D1 exposes both Worker bindings and an HTTP API that helps with tooling (importers, dashboards, third-party clients). Durable Objects are accessed only from Workers, which is fine for us but limits future tooling options.

## Migration Cost Analysis

Lock-in matters because the cost of switching scales with how much application logic depends on the storage product's specific shape. Rough estimates for a four-person team in our context:

| From → To | What has to happen | Estimated effort |
|---|---|---|
| **D1 → Postgres** (or any SQL DB) | Export via `wrangler d1 export` to `.sql`. Translate SQLite-flavored DDL to Postgres dialect (mostly mechanical: `INTEGER PRIMARY KEY` → `BIGSERIAL`, `TEXT` ≈ `TEXT`, JSON1 functions → `jsonb`). Swap the D1 binding for a SQL driver (e.g., postgres.js over Hyperdrive). Re-run integration tests. | **1–2 sprints** |
| **KV → anything queryable** | Data is unstructured key→blob. Have to write a migration script that reads every key, parses each blob, infers a schema, and inserts into the destination as rows. Re-implement every "list and filter in JS" code path as a real query. | **2–3 sprints** |
| **R2 → anything queryable** | Object storage isn't a database. By the time we'd be migrating, we've already built a query layer on top of R2; that custom indexing layer has to be either ported or replaced. The data itself is exportable but the *application architecture* is what costs. | **3+ sprints** |
| **Durable Objects → centralized DB** | State is sharded across many object instances. Need a custom export tool that walks the DO namespace, reads each object's SQLite database, and consolidates into a single destination DB while reconciling primary keys across shards. | **2+ sprints** |

The point of this table is not precision — the numbers are rough — but documented awareness of the tradeoff. **D1 is the cheapest to leave**, which compounds its appeal: if WatchTower ever outgrows the academic project and someone wants to take it forward, the path off Cloudflare is the shortest from D1.

## More Information

**Primary sources (Cloudflare documentation):**

- D1 pricing: <https://developers.cloudflare.com/d1/platform/pricing/>
- D1 limits: <https://developers.cloudflare.com/d1/platform/limits/>
- D1 overview: <https://developers.cloudflare.com/d1/>
- Workers KV pricing: <https://developers.cloudflare.com/kv/platform/pricing/>
- Workers KV limits: <https://developers.cloudflare.com/kv/platform/limits/>
- R2 pricing: <https://developers.cloudflare.com/r2/pricing/>
- Durable Objects pricing: <https://developers.cloudflare.com/durable-objects/platform/pricing/>
- Durable Objects limits: <https://developers.cloudflare.com/durable-objects/platform/limits/>
- D1 vs. SQLite-in-Durable-Objects comparison: <https://developers.cloudflare.com/durable-objects/best-practices/access-durable-objects-storage/>
- Workers platform pricing (umbrella): <https://developers.cloudflare.com/workers/platform/pricing/>

**Related WatchTower ADRs (planned, not yet written):**

- ADR-0002: Event data model (schema for `events`, `releases`, `projects` tables)
- ADR-0003: Ingest rate limiting and per-project quotas
- ADR-0004: Use of R2 for large-blob attachments (source maps, screenshots) — only if we decide we need them

**Open follow-ups:**

- Reconfirm free-tier numbers immediately before changing this ADR's status from Proposed to Accepted; Cloudflare adjusts these caps occasionally.
- Decide whether to use a single D1 database with `project_id` as a partition column, or one D1 database per project. Default for now: single database. Revisit if write quota or single-threaded contention becomes a real issue during peer-review week.
- TA Audria sign-off in the weekly meeting before this moves to Accepted.
