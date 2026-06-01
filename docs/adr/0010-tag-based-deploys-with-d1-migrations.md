# ADR-0010: Tag-Based Deploys with Remote D1 Migrations

## Status
Accepted

## Date
2026-05-26

## Context

WatchTower runs on Cloudflare Workers + D1 with two production services (ingest, api) and a schema that evolves as features land. We need to decide:

1. **When does production deploy?** On every merge to `main`, or only on explicit release?
2. **How do schema migrations run?** Manually by a human, or automated as part of the deploy pipeline?

Options for triggering deploys:

- **Deploy-on-merge to `main`** — fastest feedback, but every merged PR ships to production. For a class project with many contributors and limited monitoring, this is risky: a missed `npm test` failure or a stale migration lands in prod immediately.
- **Tag-based deploys** — `main` stays "ready to release," but production only updates when a maintainer pushes a `v*` tag (e.g. `v0.1.0`). Satisfies the rubric's SemVer requirement naturally — the version IS the deploy trigger.

Options for migrations:

- **Manual `wrangler d1 migrations apply --remote`** — someone has to remember; easy to forget; deploys can land before schema does.
- **Automated, gated before deploy** — CI runs migrations first; only if migrations succeed does the Worker deploy proceed.

## Decision

`.github/workflows/deploy.yml` triggers on `push: tags: ['v*']`. The workflow has two jobs:

1. **`migrate`** — runs `npx wrangler d1 migrations apply watchtower --remote` against the production D1 database. Only executed once per deploy.
2. **`deploy`** — `needs: migrate`, so it cannot run unless migrations succeed. Uses a matrix (`worker: [ingest, api]`) to deploy both Workers in parallel.

A `concurrency` group (`deploy-${{ github.ref }}`, `cancel-in-progress: false`) prevents two tag pushes from racing each other through the migration step.

Release flow:
1. Verify `main` is green on CI.
2. Update `CHANGELOG.md`.
3. Tag: `git tag v0.x.y && git push origin v0.x.y`.
4. GitHub Actions runs migrations, then deploys both Workers.

## Consequences

### Positive
- **SemVer becomes load-bearing** — the tag IS the release, so version numbers can't drift from what's deployed.
- **Schema/code ordering is guaranteed** — `needs: migrate` makes it impossible to deploy code that depends on a column that doesn't exist yet.
- **`main` is always shippable but not always shipped** — gives reviewers room to land work without pressure to also operate prod.
- **Easy rollback** — deploying `v0.1.0` on top of a broken `v0.2.0` is just `git tag v0.1.0-rollback <sha> && git push --tags`.
- **`cancel-in-progress: false`** — two simultaneous deploys queue safely; we never get a half-applied migration.

### Negative
- **Forward-only migrations** — Wrangler D1 migrations don't run "down." Bad migrations require a corrective forward migration, not a rollback.
- **No staging environment** — tag = prod. A `staging` Cloudflare environment would require another ADR and another set of D1 bindings.
- **Tag discipline required** — pre-release tags (`v0.2.0-rc.1`) deploy to prod just like full releases. Future improvement: filter tags by pattern.
- **Manual changelog updates** — until we automate Conventional Commits → changelog generation, the human tagger has to remember.

### Out of Scope
- Staging/preview environments.
- Automatic changelog generation (see ADR-0017).
- Blue-green or canary deploys.
