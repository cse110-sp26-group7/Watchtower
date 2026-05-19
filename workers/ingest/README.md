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

## Migrations

D1 schema lives at the repo root in `db/migrations/` (shared across workers that bind the same database). `wrangler.jsonc` points this worker's `DB` binding at it via `"migrations_dir": "../../db/migrations"`.

```sh
npx wrangler d1 migrations apply watchtower --local    # for `npm run dev`
npx wrangler d1 migrations apply watchtower --remote   # for the deployed Worker
```

The vitest suite re-applies migrations into an isolated D1 instance automatically (see `vitest.config.js` + `test/apply-migrations.js`).

## Local development

```sh
npm run dev
```

Starts `wrangler dev` on `http://localhost:8787`. Only route is `POST /ingest`; envelope shape is `{ project_id, events: [<event>, ...] }` per `docs/backend/api/endpoints-draft.md`.

```sh
curl -i -X POST http://localhost:8787/ingest \
  -H 'Content-Type: application/json' \
  --data '{"project_id":"wt_demo","events":[{
    "event_id":"550e8400-e29b-41d4-a716-446655440000",
    "event_type":"error",
    "timestamp":"2026-05-18T10:00:00.000Z",
    "environment":"dev",
    "message":"hello"
  }]}'
```

Expect `204 No Content` on success. See spec for full status codes (400/413).

## Tests

```sh
npm test            # one-shot run via @cloudflare/vitest-pool-workers
npm test -- --watch # re-run on save
```

Tests run against the Workers runtime, not Node — `globalThis.fetch`, `Request`, `Response`, etc. behave as they do in production.

## Smoke check

`scripts/smoke.sh` runs 5 curl-based checks (golden, idempotent replay, malformed JSON, OPTIONS preflight on `/ingest` + unknown path) against a live Worker. Pair with `npm run dev`:

```sh
./scripts/smoke.sh                                       # defaults to http://localhost:8787
BASE_URL=https://<your-worker-url> ./scripts/smoke.sh    # deployed Worker
```

Vitest stays the primary correctness suite. The smoke script verifies that a live (deployed or locally-served) Worker actually responds end-to-end, which the in-process vitest harness cannot check.

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

- **Worker config:** `wrangler.jsonc`. D1 binding `DB` is wired to the `watchtower` database (provisioned in Cloudflare). Add KV / R2 / Queue bindings here as needed.
- **Plain env vars:** add under a `vars` block in `wrangler.jsonc` (committed — non-sensitive only).
- **Secrets:** `npx wrangler secret put <NAME>` — never commit these. For local dev, create a gitignored `.dev.vars` file (`KEY=value` per line); wrangler loads it automatically.

## Layout

```
workers/ingest/
├── src/index.js                   # POST /ingest handler (default export)
├── test/
│   ├── index.spec.js              # vitest cases
│   └── apply-migrations.js        # setup: applies D1 migrations into the test isolate
├── scripts/
│   └── smoke.sh                   # curl smoke check against a live Worker
├── wrangler.jsonc                 # Worker config (D1 `DB` binding, migrations_dir → ../../db/migrations)
├── eslint.config.mjs
├── vitest.config.js
└── package.json
```

The events table migration lives at the repo root: `db/migrations/0001_events.sql`. Both `workers/ingest/` (writes) and `workers/api/` (reads, Task 4) point at this shared directory.
