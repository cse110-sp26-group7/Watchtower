# watchtower-ingest

Cloudflare Worker that accepts event payloads from the WatchTower client SDK and CI deploy hooks. See `docs/ARCHITECTURE.md` §3.2 for context.

## Prerequisites

- Node.js 20+ (`node --version`)
- npm 10+ (ships with Node)

`wrangler` is pinned in `devDependencies`, so a global install is not required. All commands below use the local copy via npm scripts.

## Setup

```sh
cd workers/ingest
npm install
```

## Local development

```sh
npm run dev
```

Starts `wrangler dev` on `http://localhost:8787`. Hitting `/` should return `Hello World!` until the ingest handler lands.

```sh
curl -i http://localhost:8787/
```

## Tests

```sh
npm test            # one-shot run via @cloudflare/vitest-pool-workers
npm test -- --watch # re-run on save
```

Tests run against the Workers runtime, not Node — `globalThis.fetch`, `Request`, `Response`, etc. behave as they do in production.

## Lint

```sh
npm run lint
```

Flat-config ESLint over `src/`. Config lives in `eslint.config.mjs`.

## Deploy

```sh
npm run deploy
```

Requires a Cloudflare account and a one-time `npx wrangler login`. CI handles deploys on merge to `main` (see `.github/workflows/`); manual deploys should be rare.

## Configuration

- **Worker config:** `wrangler.jsonc`. Bindings (D1, KV, secrets) go here once we wire storage.
- **Plain env vars:** add under a `vars` block in `wrangler.jsonc` (committed — non-sensitive only).
- **Secrets:** `npx wrangler secret put <NAME>` — never commit these. For local dev, create a gitignored `.dev.vars` file (`KEY=value` per line); wrangler loads it automatically.

## Layout

```
workers/ingest/
├── src/index.js          # Worker entry (default export with fetch handler)
├── test/index.spec.js    # vitest specs
├── wrangler.jsonc        # Worker config
├── eslint.config.mjs
├── vitest.config.js
└── package.json
```
