# watchtower-api

Cloudflare Worker that serves dashboard read traffic. See `docs/ARCHITECTURE.md` §3.4 and `docs/backend/api/endpoints-draft.md` for the endpoint contract.

Implemented: `GET /api/events` (filter + cursor-paginated listing). Auth (signed session cookie per ADR-0005) and the remaining reporting routes are sprint-4 work.

## Prerequisites

- Node.js 20+ (`node --version`)
- npm 10+ (ships with Node)

`wrangler` is pinned in `devDependencies`, so a global install is not required. All commands below use the local copy via npm scripts.

## Setup

```sh
cd workers/api
npm install
```

## Local development

```sh
npm run dev
```

Starts `wrangler dev` on `http://localhost:8787`. Try the endpoint:

```sh
curl -i 'http://localhost:8787/api/events?project_id=wt_test'
# → 200 { "events": [], "next_cursor": null, "has_more": false }
```

If `workers/ingest/` is already running on port 8787, start this one on a different port:

```sh
npm run dev -- --port 8788
```

## Endpoints

### GET /api/events

Filtered event listing with pagination. Full contract: `docs/backend/api/endpoints-draft.md` §`GET /api/events`.

Defaults (last 24 h of error events, newest first):

```sh
curl 'http://localhost:8787/api/events?project_id=wt_a1b2c3d4'
```

Filtered:

```sh
curl 'http://localhost:8787/api/events?project_id=wt_a1b2c3d4&type=performance&since=7d&limit=100'
```

`since` accepts ISO 8601 (`2026-05-09T00:00:00.000Z`) or shorthand `<n>h` / `<n>d` (e.g. `1h`, `24h`, `7d`). Other suffixes (`m`, `w`) are rejected. `until` accepts ISO 8601 only and defaults to "now."

Paginate by passing the previous response's `next_cursor`:

```sh
curl 'http://localhost:8787/api/events?project_id=wt_a1b2c3d4&cursor=<next_cursor>'
```

`400` responses carry `{ "error": "missing_param" | "invalid_param", "param": "<name>" }`.

## End-to-end smoke test

`scripts/smoke.sh` documents the intended ingest→read flow. It is **not yet runnable end-to-end** — it depends on the `POST /ingest` handler (Task 2). Until that lands, the POST step hits the placeholder `"Hello World!"` response and the GET returns `[]`. Once Theo's handler is in, the same script will round-trip a real event without changes.

```sh
./scripts/smoke.sh
```

## Tests

```sh
npm test            # one-shot run via @cloudflare/vitest-pool-workers
npm test -- --watch # re-run on save
```

Tests run against the Workers runtime (miniflare with an in-memory D1), not Node — no Cloudflare login required for local test runs.

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

- **Worker config:** `wrangler.jsonc`. Shares the `DB` binding with `workers/ingest/` (same `watchtower` D1 database) so this Worker reads what ingest writes.
- **Plain env vars:** add under a `vars` block in `wrangler.jsonc` (committed — non-sensitive only).
- **Secrets:** `npx wrangler secret put <NAME>` — never commit these. For local dev, create a gitignored `.dev.vars` file (`KEY=value` per line); wrangler loads it automatically.

## Layout

```
workers/api/
├── src/
│   ├── index.js              # Worker entry (router + GET /api/events handler)
│   └── query.js              # Query parsing, cursor codec, row shaping
├── test/
│   ├── index.spec.js         # vitest specs (router + GET /api/events)
│   └── apply-migrations.js   # Applies db/migrations/ to the in-memory D1 once per session
├── scripts/smoke.sh          # End-to-end ingest→read smoke test (manual)
├── wrangler.jsonc            # Worker config (D1 binding: DB)
├── eslint.config.mjs
├── vitest.config.js
└── package.json
```
