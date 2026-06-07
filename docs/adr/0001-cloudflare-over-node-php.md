# ADR-0001: Cloudflare Workers + Pages as the WatchTower Platform

## Status
Accepted

## Date
2026-05-06

## Context

WatchTower needs a place to host two things:

1. A server-side ingest endpoint that accepts high-volume `POST` traffic from instrumented browsers and from GitHub Actions deploy hooks, plus a reporting API that the dashboard reads from.
2. A static dashboard SPA (vanilla HTML/CSS/JS) that authenticated users open in a browser.

The CSE 110 technical constraints draw a hard fence around this decision:

> Any server-side based technologies must work on Cloudflare or GitHub Pages only.

That sentence eliminates the entire conventional "rent a Node server" / "deploy a PHP app to a LAMP host" / "use Heroku/Render/Fly" family of options before we begin. Within the constrained option set, we still have a real choice between:

- **GitHub Pages only** (static dashboard) with a third-party form/ingest service for writes. Not viable: GitHub Pages serves static files, has no first-party way to accept and persist `POST` traffic, and stitching in an external ingest service would re-introduce the "third-party server" the rule was written to forbid.
- **Cloudflare Workers + Pages**, where Workers run the ingest + API endpoints and Pages serves the dashboard. Server-side code stays inside the Cloudflare boundary; the static dashboard sits next to it on the same provider.

Course constraint aside, the project's own shape pushes the same way: an observability backend is by definition a write-heavy network endpoint, so a static-only host is structurally wrong for what we're building.

## Decision

**All server-side code runs on Cloudflare Workers. The dashboard is served from Cloudflare Pages.** No Node-hosted backend, no PHP, no third-party application server.

Concretely:

- `workers/ingest/` deploys to `watchtower-ingest.*.workers.dev` and accepts `POST /ingest` from the client SDK and from CI.
- `workers/api/` deploys to `watchtower-api.*.workers.dev` and serves `/api/login`, `/api/events`, `/api/summary`, `/api/deploys` to the dashboard (split rationale in ADR-0009).
- The dashboard SPA deploys to Cloudflare Pages.
- Persistence is Cloudflare D1 (ADR-0002), bound to both Workers.
- `wrangler` is the only deploy tool (ADR-0011); deploys are tag-triggered via GitHub Actions (ADR-0010).

## Consequences

### Positive
- **Satisfies the course constraint by construction** — there is no third-party application server to justify or migrate off of.
- **One vendor, one CLI, one billing surface** — Workers, Pages, and D1 are all configured through `wrangler` and the Cloudflare dashboard.
- **Free-tier covers a class-scale project** — Workers' 100k requests/day and Pages' unlimited static requests are well above our expected demo + peer-review traffic. No credit card required.
- **Edge runtime is fast enough that we don't need a CDN layer in front of it** — Workers run at every Cloudflare PoP; static assets on Pages do too.
- **`wrangler dev` gives us a realistic local environment** — the same Worker code runs locally and in production against the same D1 binding format.
- **Native bindings for D1, KV, R2, secrets** — no SDK install, no driver, no connection-pool tuning.

### Negative
- **We are locked into the Cloudflare ecosystem for the project's lifetime.** Workers is V8 isolates, not Node — code that relies on Node-only APIs (`fs`, `child_process`, native modules) will not run. None of WatchTower's code path needs them, but a future maintainer porting in third-party code might hit this.
- **No long-running processes, no WebSockets in v1, no cron from the same Worker** (Cron Triggers are a separate primitive). Acceptable for an HTTP-shaped ingest + read workload.
- **Cold-start behavior and CPU-time limits are platform-specific** — 10 ms CPU time per request on the free plan. Comfortable for our handlers but a real constraint that doesn't exist on a Node server.
- **Cloudflare account ownership becomes a bus-factor risk** — the account holder gates deploys. Documented in `docs/devops/` so the next maintainer can take over.

### Out of Scope
- Migration paths off Cloudflare. The course timeline doesn't justify investing in portability tooling we won't use. ADR-0002 covers the storage-side migration cost.
- Multi-region replication, geo-pinned data residency, paid-tier features. The free tier is the design target.
- Self-hosted alternatives (Docker on a VPS, a Pi in someone's closet). Explicitly forbidden by the course rules.

## More Information

- Course rule: `project-options.md` — "Any server-side based technologies must work on Cloudflare or GitHub Pages only."
- Related: ADR-0002 (D1 storage), ADR-0009 (two-worker split), ADR-0010 (tag-based deploys), ADR-0011 (Wrangler toolchain), ADR-0018 (matrix CI).
- Architecture: `docs/ARCHITECTURE.md` §5 — "Why this stack".
