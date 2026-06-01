# ADR-0008: Vitest as the Test Framework Across All Packages

## Status
Accepted

## Date
2026-05-26

## Context

WatchTower has three independently-versioned JavaScript surfaces that need automated testing:

1. The **browser SDK** (`client/watchtower.js`) — runs in arbitrary customer browsers, ships as a single CDN-hosted file.
2. The **ingest Worker** (`workers/ingest/`) — runs on the Cloudflare Workers runtime, writes to D1.
3. The **API Worker** (`workers/api/`) — also Cloudflare Workers + D1, but read-path with cookie auth.

Each surface has a different runtime: a browser, the Workers V8 isolate, and Node (for the SDK's unit tests). Picking a single framework that can target all three avoids context-switching between tooling, configs, and assertion APIs.

Options considered:

- **Node's built-in test runner (`node:test`)** — zero-dep, but no Workers integration, no module-mocking story, and limited assertion ergonomics.
- **Jest** — mature, but slow under ESM, requires Babel/SWC for transforms, no first-class Workers support.
- **Vitest** — Vite-powered, ESM-native, fast, ships `vi.stubGlobal` and `vi.fn` out of the box. Cloudflare publishes `@cloudflare/vitest-pool-workers`, which runs the actual Workers runtime under Vitest — meaning Worker tests execute against a real `Request`/`Response`/`D1Database`, not mocks.

Cloudflare's first-party Vitest pool is the decisive factor: it's the only option that lets us test Worker code against the real runtime without spinning up `wrangler dev` and an HTTP client.

## Decision

We use **Vitest ~3.2** across every JS package in the repo:

- `workers/ingest` and `workers/api` use Vitest with `@cloudflare/vitest-pool-workers ^0.12.4` to run tests inside the Workers runtime against a real D1 binding.
- `client/` uses Vitest with the default Node pool. Browser globals (`sessionStorage`, `navigator`, `window`, `crypto`) are stubbed per-test via `vi.stubGlobal`.
- Each package owns its own `vitest.config.js` and runs tests via `npm test` inside its own directory.

CI runs `npm test` in each Worker package via the matrix job in `.github/workflows/ci.yml`. (Wiring the `client/` suite into CI is tracked separately and is a known gap as of this ADR.)

## Consequences

### Positive
- One framework, one assertion API (`expect(...)`), one mocking story across the repo — lower cognitive load for contributors.
- Worker tests run inside the actual V8 isolate via `@cloudflare/vitest-pool-workers`, so behaviour like `Request` cloning, `caches.default`, and D1 prepared statements is real, not mocked.
- Vitest watch mode is fast enough that TDD on the SDK is practical without a bundler.
- ESM-native, so the SDK can eventually migrate from CJS exports without retooling tests.

### Negative
- Vitest is on a fast release cadence; pinning to `~3.2` is a conscious choice to avoid surprise minor-version breakage.
- The Workers pool requires `wrangler` as a peer install, which inflates `node_modules` for each Worker package.
- Stubbing browser globals manually in `client/` tests is more verbose than running under `happy-dom` or `jsdom`, but avoids pulling in another dependency for a ~400-line SDK.

### Out of Scope
- E2E browser tests (Playwright) — separate ADR if/when added.
- Coverage thresholds and reporters — not enforced yet.
