# ADR-0012: Monorepo with Per-Package Lockfiles (No npm Workspaces)

## Status
Accepted

## Date
2026-05-26

## Context

WatchTower's repo contains several JavaScript packages with different runtimes and audiences:

| Path             | Runtime         | Audience                       |
|------------------|-----------------|--------------------------------|
| `client/`        | Browser         | End customers (via CDN)        |
| `cli/`           | Node            | End customers (`npx`)          |
| `dashboard/`     | Browser         | WatchTower operators           |
| `workers/ingest` | Workers runtime | Internal — write path          |
| `workers/api`    | Workers runtime | Internal — read path           |

Options for dependency management:

- **npm workspaces (single root lockfile)** — one `npm install` installs everything; deduplicates dependencies; one lockfile to commit. But: a single dependency upgrade in one package can force-bump deps in another via hoisting; Wrangler doesn't fully understand workspace-hoisted `node_modules`; per-package CI caching becomes harder.
- **Independent packages, each with its own `package.json` + `package-lock.json`** — packages stay isolated; per-package CI cache works naturally; Wrangler sees a normal `node_modules` next to each Worker. But: more lockfiles to maintain, no deduplication, slightly more `npm ci` time in CI.

## Decision

Each package owns its own `package.json` and `package-lock.json`. There are no npm workspaces.

- Root `package.json` exists only to host ESLint config and is intentionally minimal.
- `cli/`, `workers/ingest/`, and `workers/api/` each have their own lockfile.
- `client/` and `dashboard/` historically had no `package.json` — they ship as static files. (PR #115 added `client/package.json` for test tooling; that lockfile situation is being normalised.)
- CI caches per-package: every job in `.github/workflows/ci.yml` and `deploy.yml` sets `cache-dependency-path` to the specific lockfile it needs.

## Consequences

### Positive
- **Wrangler "just works"** in each Worker — `node_modules` sits right next to `wrangler.jsonc`, no resolution surprises.
- **Per-package CI caching** — changing `cli/` doesn't invalidate the Worker caches and vice versa.
- **Blast-radius isolation** — a transitive-dep CVE in one package doesn't fan out across the whole repo.
- **Easier publishing** — `cli/` can be `npm publish`'d directly without `workspaces` flag gymnastics.

### Negative
- **No automatic dedup** — `vitest`, `eslint`, and `wrangler` are installed in multiple `node_modules` trees, costing disk and install time.
- **Coordinated upgrades are manual** — bumping `vitest` requires editing 3+ lockfiles. Tooling like Dependabot or Renovate is recommended once dep count grows.
- **Drift risk** — easy to accidentally leak a dep into the wrong package's `package.json` (PR #115 leaked `vitest` into the root lockfile without updating the root `package.json`, causing `npm ci` drift). New contributors must understand this convention.
- **No root-level "install everything"** — onboarding requires running `npm ci` in each package directory.

### Out of Scope
- Migrating to npm workspaces, pnpm, or Turborepo. Revisit if package count grows past ~6 or if shared-code needs emerge.
- A monorepo task runner (Nx, Turborepo).
