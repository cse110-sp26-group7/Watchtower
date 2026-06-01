# ADR-0009: Split Backend into Two Workers (Ingest and API)

## Status
Accepted

## Date
2026-05-26

## Context

WatchTower's backend has two fundamentally different workloads:

- **Ingest** — receives high-volume, unauthenticated, fire-and-forget POSTs from customer browsers (errors, performance vitals, page views, deploys). Latency-sensitive on the customer side, must never bounce a write.
- **API** — serves authenticated reads to our own dashboard. Lower volume, cookie-gated (ADR-0005), latency-sensitive on our UI.

Two options were on the table:

1. **One Worker with internal routing** — single deploy, simpler ops, one DNS record.
2. **Two Workers, one per workload** — `watchtower-ingest` and `watchtower-api`, each with its own route and deploy.

A single Worker would be simpler day-one, but the two workloads have different blast radii: a bug in the auth/read path should not be able to take down the write path that customers depend on. Customer-visible failure of `/ingest` means lost telemetry forever — there's no retry from the browser. Failure of `/api/*` means our internal dashboard is broken, which we'll notice immediately and can fix.

## Decision

Two Cloudflare Workers, deployed independently from `workers/ingest/` and `workers/api/`:

- Both share the same D1 database binding (`DB` → `watchtower`, ID `c65d1f5e-...`) declared in each `wrangler.jsonc`.
- Both share the same migrations directory (`../../db/migrations`).
- CI builds and tests them as a matrix (`worker: [ingest, api]`) in `.github/workflows/ci.yml`.
- Deploys are independent matrix jobs in `.github/workflows/deploy.yml` — a bad deploy of one does not block the other.

## Consequences

### Positive
- **Blast radius isolation** — a deploy that breaks the API does not interrupt ingest, and vice versa.
- **Independent scaling and observability** — each Worker shows up as its own line in the Cloudflare dashboard, with its own analytics, error rates, and CPU time.
- **Smaller bundles per Worker** — neither carries code it doesn't use; faster cold starts.
- **Clear ownership** — contributors editing the read path don't risk accidentally changing write-path validation or vice versa.

### Negative
- **Two `package.json`, two `wrangler.jsonc`, two lockfiles to keep in sync** when dependencies like `wrangler` or `vitest` are upgraded.
- **Shared D1 schema requires coordination** — a migration that adds a column read by one Worker but written by the other has to land in a specific order. Mitigated by both Workers running migrations through the same `db/migrations` directory.
- **Code duplication risk** — utilities that genuinely belong to both (e.g. event envelope validation) currently have no shared package. If duplication grows, a `workers/shared/` package may be warranted.

### Out of Scope
- A shared library package — deferred until we have ≥2 utilities that visibly need to be shared.
- Cross-Worker service bindings — both Workers talk to D1 directly; neither calls the other.
