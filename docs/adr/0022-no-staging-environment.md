# ADR-0022: No Separate Staging Environment; Tags Gate Production

## Status
Accepted

## Date
2026-06-04

## Context

Sprint 5's risk register flagged a real problem: there is no staging environment. Every merge to `main` produces an artifact that, if tagged, deploys to the same Cloudflare account that the demo runs against. One bad merge tagged at the wrong moment could break the demo. The CSE 110 timeline and Cloudflare Free-tier shape this decision more than ideal engineering would.

What "staging" would cost us, if we built it:

- A second Workers deploy target per Worker (ingest, api).
- A second D1 database with parallel migrations.
- A second Cloudflare Pages project for the dashboard.
- A second GitHub Actions deploy workflow, parameterized by environment.
- A second set of secrets, rotated independently.
- A second URL the team has to remember.

For a four-week project run by ~13 students with limited Cloudflare admin access, the operational tax of maintaining two parallel environments is meaningfully larger than the risk of the failure mode it protects against — *if* we have an alternative way to prevent broken `main` from reaching production.

Options:

1. **No staging; deploy on every merge to `main`.** Simplest, riskiest. A bad merge ships immediately.
2. **No staging; deploy only on tagged releases.** Adopted, see Decision.
3. **Branch-based staging (a `staging` branch with its own Cloudflare Pages preview).**
4. **Full second environment (Workers + Pages + D1 + secrets).**

## Decision

**No separate staging environment. Production is the only environment. Production deploys are gated on a SemVer git tag (ADR-0010), not on a merge to `main`.**

The pre-production protections we rely on instead:

- **PR review gate.** PRs are required for changes >300 LoC (course rule) and in practice for almost everything. CI runs lint + unit tests against every PR (ADR-0018).
- **Cloudflare Pages preview deployments.** Every PR gets an automatic ephemeral preview URL for the dashboard. That's our review-time UI sanity check.
- **`wrangler dev` for Workers.** Reviewers can run the Worker locally against the same D1 binding shape, including against a local SQLite database.
- **Tag-gated production deploys.** Merging to `main` does *not* deploy. Only `git tag v0.x.y && git push --tags` does. The tag is the explicit "ship it" act.
- **A "demo-ready" tag convention before final demos.** Cut the demo tag at a feature-freeze checkpoint; do not tag again until the demo is over.
- **D1 Time Travel** (ADR-0002) gives 30 days of point-in-time recovery for the database, which is the single most expensive thing to roll back.

If the project grows beyond the course timeline, a staging Worker + staging D1 + staging Pages deployment is the natural next step and is explicitly *out of scope* for this ADR, not rejected.

## Consequences

### Positive
- **One environment to operate.** No drift between staging and prod, no "it worked in staging" debugging.
- **Tag-gated deploys mean a bad `main` does not auto-ship.** The dangerous failure mode (Sprint 5 risk #1) is meaningfully reduced.
- **Per-PR Pages preview** covers the most common pre-merge sanity check (does the dashboard render? does the new page work?).
- **Free-tier headroom is not split** across two environments.
- **Onboarding is simpler.** New contributors learn one set of URLs, one set of secrets, one deploy workflow.

### Negative
- **No place to test migrations against real-shaped data before they hit prod.** Mitigated by D1 Time Travel (point-in-time restore within 30 days) and by reviewing migrations as part of the PR.
- **No place to run destructive performance tests.** If we ever need load-testing, we'll have to spin up a temporary Worker; until then, deferred.
- **The "tag = ship" discipline is informal.** A maintainer who tags `main` while it's broken still ships a broken release. We rely on the tagger having run CI and looked at the PR.
- **Demo risk is reduced but not eliminated.** A misclick at tag time still ships immediately.
- **No long-running soak environment.** Bugs that only surface after hours of traffic are caught in prod.

### Out of Scope
- Building a staging environment after the course ends. This ADR doesn't ban it; future maintainers should revisit.
- A canary/percentage rollout. Cloudflare Workers supports gradual deployments; we don't use it.
- Feature flags as a substitute for environments. Useful, but a separate ADR if we adopt one.

## More Information

- Sprint 5 risk register: `docs/sprints/sprint-5.md` — "No staging environment".
- Related: ADR-0010 (tag-based deploys are the actual gate), ADR-0002 (D1 Time Travel is the rollback story), ADR-0018 (CI on every PR is the pre-merge gate).
