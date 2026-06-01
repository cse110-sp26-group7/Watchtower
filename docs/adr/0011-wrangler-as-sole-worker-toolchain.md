# ADR-0011: Wrangler as the Sole Toolchain for Workers

## Status
Accepted

## Date
2026-05-26

## Context

Cloudflare Workers have several build/dev/deploy paths:

- **`wrangler`** — Cloudflare's official CLI. Handles `dev` (local emulation), `deploy`, `d1` (database migrations and queries), `tail` (live logs), and `secret put`.
- **Wrangler + a separate bundler (esbuild/rollup/vite)** — useful if the Worker code has complex bundling needs.
- **Third-party frameworks (Hono build tools, Wrangler-compatible Vite plugins)** — abstractions that wrap Wrangler.

Both Workers in this repo (`workers/ingest`, `workers/api`) are small (single `src/index.js` each), use only stdlib + D1, and have no exotic bundling requirements. Pulling in a bundler would add config to maintain and a dependency to upgrade for no current benefit.

## Decision

Each Worker uses **Wrangler ^4.90 as its sole toolchain**. The contract is the same in both `workers/ingest/package.json` and `workers/api/package.json`:

```json
"scripts": {
  "deploy": "wrangler deploy",
  "dev":    "wrangler dev",
  "start":  "wrangler dev",
  "test":   "vitest"
}
```

Configuration lives in `wrangler.jsonc` per Worker. Both Workers share:

- `compatibility_date: "2026-05-08"` and `compatibility_flags: ["nodejs_compat"]`
- `observability.enabled: true` (Cloudflare-native logs/metrics)
- `upload_source_maps: true` (stack traces map back to source)
- A single shared D1 binding (`DB` → `watchtower`, see ADR-0009)
- `migrations_dir: "../../db/migrations"` — both Workers point at the same migrations directory

CI uses `npx wrangler deploy` (deploy workflow) and `npx wrangler d1 migrations apply --remote` (migrate job, ADR-0010). No `wrangler` binary is installed globally; every invocation goes through the per-package `node_modules`.

## Consequences

### Positive
- **Zero bundler config to maintain** — Wrangler ships with esbuild internally; we never touch it.
- **`npm ci && npm run dev`** is the only setup any contributor needs.
- **`observability.enabled`** and **source maps** give us free production debuggability without extra tooling.
- **`compatibility_date` is explicit and pinned** — Worker runtime changes won't silently alter our behaviour.
- **One binary, one upgrade path** — upgrading Wrangler upgrades dev, deploy, and migrations together.

### Negative
- **Wrangler is on a fast release cadence** (major versions roughly yearly). Upgrading both Workers in lockstep is a recurring chore.
- **No tree-shaking control** — if we ever need to slim a bundle, we'd have to add a bundler step.
- **`nodejs_compat` is enabled** — slightly heavier than running pure-Workers code, but lets us use `node:crypto` where useful.

### Out of Scope
- A custom bundler step.
- Wrangler `env` profiles for staging/preview (deferred until we have those environments).
