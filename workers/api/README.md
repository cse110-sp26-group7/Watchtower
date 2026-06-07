# watchtower-api

Cloudflare Worker that serves dashboard read traffic. See `docs/ARCHITECTURE.md` §3.4 and `docs/backend/api/endpoints-draft.md` for the endpoint contract.

Implemented: `POST /api/login` / `POST /api/logout`, `GET /api/events` (filter + cursor-paginated listing), `GET /api/events/:event_id` (detail + deploy correlation), and `GET /api/summary` (aggregated counts + timeseries for the overview). Auth (signed session cookie per ADR-0005) is enforced on `/api/*`.

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

Starts `wrangler dev` on `http://localhost:8787`. Every `/api/*` request needs the CSRF header, and everything except login needs a session cookie, so log in first (the demo user is seeded by the migrations):

```sh
curl -i -c /tmp/wt.jar -X POST 'http://localhost:8787/api/login' \
  -H 'X-Watchtower-Auth: 1' -H 'Content-Type: application/json' \
  -d '{"email":"demo@watchtower.dev","password":"demo1234"}'

curl -i -b /tmp/wt.jar 'http://localhost:8787/api/events?project_id=wt_demo' \
  -H 'X-Watchtower-Auth: 1'
# → 200 { "events": [...], "next_cursor": null, "has_more": false }
```

If `workers/ingest/` is already running on port 8787, start this one on a different port:

```sh
npm run dev -- --port 8788
```

## Endpoints

The curl examples below omit the auth flags; add `-b /tmp/wt.jar -H 'X-Watchtower-Auth: 1'` from the login step above.

### POST /api/login, POST /api/logout

`POST /api/login` (`{ email, password }`) verifies seeded credentials, sets the signed `wt_session` cookie, and returns `{ user, projects }`. `POST /api/logout` revokes the session row and clears the cookie. Contract: ADR-0005.

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

### GET /api/events/:event_id

Full shaped event plus deploy correlation:

```sh
curl 'http://localhost:8787/api/events/<event_id>'
```

Returns `{ event, correlated_deploy }`. `correlated_deploy` is the deploy event matching the event's own `deploy_id` when the SDK supplied one, otherwise the nearest deploy at-or-before the event's timestamp in the same project; `null` if there is none. `404 { "error": "not_found" }` on unknown `event_id`; ownership is gated through the event's project (403 on someone else's).

### GET /api/summary

Aggregated counts plus a zero-filled timeseries for the dashboard overview. Full contract: `docs/backend/api/endpoints-draft.md` §`GET /api/summary`.

```sh
curl 'http://localhost:8787/api/summary?project_id=wt_a1b2c3d4&window=24h'
```

Query params:

- `project_id` (required)
- `window` (optional, default `24h`): one of `1h | 24h | 7d | 30d`. Bucket size scales with the window and is reported in `timeseries.bucket_size`: `1m` for `1h` (60 buckets), `1h` for `24h`/`7d`, `1d` for `30d`.
- `timezone` (optional): **not yet honored** — buckets are always UTC. The param is accepted (and ignored) so callers can keep sending it during the UTC-only sprint.

Response (`200`): `totals` (`errors`, `feedback_count`, `feedback_avg`, `performance_p75` per Web Vital), `timeseries.errors` / `timeseries.feedback` (each a continuous, zero-filled array of `{ t, count[, avg] }`), and `site_status` (`"issues"` if any error in the last 15 min, else `"ok"`). `feedback_avg` and per-metric `performance_p75` are `null` when there is nothing to average. `performance_p75` uses nearest-rank (an actual observed value, no interpolation).

Like `/api/events`, requests are gated by the session cookie (ADR-0005): an unknown `project_id` returns `404 { "error": "unknown_project" }`, and a `project_id` not owned by the session user returns `403 { "error": "forbidden" }`. `400` responses carry `{ "error", "param" }`.

## End-to-end smoke test

`scripts/smoke.sh` runs the ingest→read flow end-to-end: it `POST`s an error event to `workers/ingest` (`/ingest`), which writes it to D1, then reads it back via `GET /api/events`. Start both workers locally first (ingest on `:8787`, this worker on `:8788` — see above), then run it.

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

Requires a Cloudflare account and a one-time `npx wrangler login`. CI handles deploys on every `v*` tag (ADR-0010; see `.github/workflows/deploy.yml`); manual deploys should be rare. Announce tags in `#backend` before pushing them.

## Configuration

- **Worker config:** `wrangler.jsonc`. Shares the `DB` binding with `workers/ingest/` (same `watchtower` D1 database) so this Worker reads what ingest writes.
- **Plain env vars:** add under a `vars` block in `wrangler.jsonc` (committed — non-sensitive only).
- **Secrets:** `npx wrangler secret put <NAME>` — never commit these. For local dev, create a gitignored `.dev.vars` file (`KEY=value` per line); wrangler loads it automatically.

## Layout

```
workers/api/
├── src/
│   ├── index.js              # Worker entry (router + handlers: login/logout, events, event detail, summary)
│   ├── auth.js               # Session signing/verification, PBKDF2 password check (+ auth.spec.js)
│   ├── query.js              # GET /api/events: query parsing, cursor codec, row shaping
│   └── summary.js            # GET /api/summary: param parsing, bucket grid, p75, response assembly
├── test/
│   ├── index.spec.js         # vitest specs (router, events, event detail, summary)
│   ├── auth-middleware.spec.js # session gate, CSRF header, ownership, CORS
│   └── apply-migrations.js   # Applies db/migrations/ to the in-memory D1 once per session
├── scripts/smoke.sh          # End-to-end ingest→login→read smoke test (manual)
├── wrangler.jsonc            # Worker config (D1 binding: DB, ALLOWED_ORIGINS var)
├── eslint.config.mjs
├── vitest.config.js
└── package.json
```
