# Sprint 2 DevOps Backlog (week of May 11 – May 18, 2026)

DevOps team: Jack, Ethan

Inputs from Sprint 1:
- ESLint baseline merged (#52). Root `eslint.config.mjs` + per-worker config; `js/recommended` rules, ignores `node_modules/`, `dist/`, `.wrangler/`.
- Ingest worker deployed to Cloudflare (`watchtower-ingest.<sub>.workers.dev`, Hello World stub).
- D1 database `watchtower` created on Cloudflare (empty, no schema yet).
- D1 binding wired into `workers/ingest/wrangler.jsonc` (`env.DB`) — PR `chore/d1-binding` pending merge; unblocks Backend Sprint 2 Tasks 1, 2, 4.

---

## How we work

- Tasks tracked as GitHub issues #53–#57 plus three additions noted below.
- Each PR closes one task (smaller diffs, easier review). Exception: Task 1 closes #53 + #54 since they share one workflow file.
- If blocked, post in Slack `#devops` or DM Jack.

---

## Task summary

| #   | Task                                            | Owner | Issue        | Depends on   |
| --- | ----------------------------------------------- | ----- | ------------ | ------------ |
| 1   | CI workflow: lint + build check + tests         | Jack  | #53, #54     |              |
| 2   | CORS on ingest worker                           | Jack  | (new)        |              |
| 3   | Scaffold `workers/api/`                         | Jack  | (new)        |              |
| 4   | Deploy workflow + secrets management            | Jack  | #56          | #1           |
| 5   | CI deploy-event hook (deploy correlation)       | Jack  | (new)        | #4, BE schema|
| 6   | Environment separation (deferred — see below)   | Jack  | #55          | #4           |
| 7   | Deployment rollback (deferred — see below)      | Jack  | #57          | #6           |

---

## Tasks

### 1. CI workflow: lint + build check + tests

Owner: Jack
Issues: #53 (build check), #54 (automated tests)

Combines three checks into one `.github/workflows/ci.yml` running on every PR. Single workflow file = single PR, less churn than three separate ones.

Deliverables:
- `.github/workflows/ci.yml` with three jobs:
  - `lint` — `npm run lint` at root + `workers/ingest/`
  - `build` — `npx wrangler deploy --dry-run` against each worker config (validates entry point + bindings resolve)
  - `test` — `npm test` in `workers/ingest/` (passes against existing Hello World spec)
- Branch protection on `main`: require `lint`, `build`, `test` to pass before merge
- Brief README note on what runs in CI and how to reproduce failures locally

Scope:
- No coverage thresholds this sprint (no real tests yet to threshold against)
- No matrix testing across Node versions; pin to Node 20
- Build job runs against both workers once `workers/api/` is scaffolded (Task 3)

Why first: BE is about to land real code. Without CI, nothing prevents broken code reaching `main`.

---

### 2. CORS on ingest worker

Owner: Jack
Issue: TBD (file before starting)

Cross-origin POSTs to `/ingest` from the SDK currently fail at the browser. Without this, the SDK team's end-to-end demo can't run.

Deliverables:
- `OPTIONS` preflight handler in `workers/ingest/src/index.js` returning `Access-Control-Allow-Origin: *`, `Access-Control-Allow-Methods: POST, OPTIONS`, `Access-Control-Allow-Headers: Content-Type`
- Same headers on the `POST` response
- Vitest spec covering preflight + actual POST

Scope:
- Wildcard origin (`*`) for MVP — locking down to specific domains is post-MVP
- Same CORS posture will mirror onto `workers/api/` in Task 3

Why early: SDK team (BE Task 3) is blocked on this for the end-to-end demo. Land before mid-sprint.

---

### 3. Scaffold `workers/api/`

Owner: Jack
Issue: TBD (file before starting)

`workers/api/` currently holds empty placeholder files (`index.js`, `wrangler.toml`). Needs the same scaffolding treatment `workers/ingest/` got.

Deliverables:
- Replace placeholders by running `npm create cloudflare@latest workers/api` (Hello World template, JS, no immediate deploy)
- Rename worker to `watchtower-api` in `wrangler.jsonc`
- Add same D1 binding as ingest (`binding: "DB"`, same `database_name` and `database_id`) so reads and writes share one database
- Deploy once to verify it appears in the Cloudflare dashboard
- Optional cleanup: remove the leftover `wrangler.toml` placeholder; standardize on `wrangler.jsonc` across both workers

Why this sprint: BE Task 4 (`/api/events` handler) lands here. Empty placeholders mean nowhere to land it.

---

### 4. Deploy workflow + secrets management

Owner: Jack
Issue: #56

Auto-deploy both workers on merge to `main`. Tightly paired with secrets — deploy workflow needs `CLOUDFLARE_API_TOKEN` to function.

Deliverables:
- Generate Cloudflare API token (dashboard → My Profile → API Tokens → "Edit Cloudflare Workers" template, scoped to this account's Workers + D1 only)
- Add token to GitHub repo Settings → Secrets and variables → Actions as `CLOUDFLARE_API_TOKEN`
- `.github/workflows/deploy.yml` runs on push to `main`:
  - Deploys `workers/ingest/` via `wrangler deploy`
  - Deploys `workers/api/` via `wrangler deploy`
  - Only runs after the CI workflow (Task 1) passes
- Document the token rotation procedure in `docs/devops/secrets.md` (where it lives, how to regenerate, who has access)

Scope:
- One environment (production) this sprint — staging is Task 6
- No manual approval gate; auto-deploy on merge. Acceptable because CI gates the merge.

Depends on: Task 1 (CI must exist before deploy can require it to pass)

---

### 5. CI deploy-event hook (deploy correlation)

Owner: Jack
Issue: TBD (file before starting)

Required for the "which deployment started the fire?" feature (ARCHITECTURE.md §1). After each successful Worker deploy, POST a deploy event to `/ingest` so the dashboard can correlate later errors against deploys.

Deliverables:
- New job at the end of `.github/workflows/deploy.yml` (after both worker deploys succeed):
  - POSTs a `deploy` event to the live ingest URL
  - Payload matches `docs/backend/api/event-schema-draft.md` (event_id, project_id, event_type=deploy, timestamp, environment, deploy_id=$GITHUB_SHA, version from $GITHUB_REF_NAME if it's a tag)
- Verify in D1 dashboard that the row landed after the next merge

Scope:
- This sprint covers WatchTower observing its own deploys (dogfooding for demo)
- For *external* host apps using the SDK: documenting how they wire their own deploy hook lives with SDK docs (BE Task 3) — not this task

Depends on:
- Task 4 (deploy workflow must exist)
- BE schema landed so `deploys` rows (or `events` rows with type=deploy) have a place to go

---

### 6. Environment separation (deferred — Sprint 3)

Owner: Jack
Issue: #55

Staging vs production deployments. Separate workers (`watchtower-ingest-staging`, `watchtower-api-staging`), separate D1 (`watchtower-staging`), separate URLs.

Deferred rationale: hard to design well before real code and real traffic patterns exist. Sprint 2 ships one environment; Sprint 3 splits it once we know what we're separating. Premature now.

Depends on: Task 4 (deploy workflow exists), real code flowing through it.

---

### 7. Deployment rollback (deferred — Sprint 3)

Owner: Jack
Issue: #57

Mechanism to revert a bad deploy quickly. Options: `wrangler rollback`, redeploying a previous git SHA, or pinning to a known-good tag.

Deferred rationale: rollback to "production" when there's only one environment is just "redeploy previous SHA" — trivial. The real rollback story needs staging/prod separation (Task 6) first. Building a sophisticated rollback before that is over-engineering.

Depends on: Task 6.

---

## Out of scope this sprint

- Real source-map upload / stack-trace symbolication (ARCHITECTURE.md §8 — explicitly deferred for MVP)
- Multi-region D1 replication (D1 free tier doesn't support, also §8)
- Cost monitoring / billing alerts (not yet relevant at free-tier usage)
- Custom domain on the workers (`*.workers.dev` URLs are fine for class project)

## Cross-team notes

- **Backend Task 1 (ingest scaffold, Gabrielle)**: already deployed. BE pulls the merged `chore/d1-binding` branch and is unblocked.
- **Backend Task 3 (SDK, Michael/Bishal)**: blocked on Task 2 (CORS) for the cross-origin demo. Land Task 2 by mid-sprint.
- **Backend Task 4 (Reporting API, Theo/Gabrielle)**: blocked on Task 3 (scaffold). Land Task 3 by mid-sprint.
- **Deploy correlation feature**: requires coordination — Task 5 (this team), schema column for `deploy_id` (BE), and `watchtower.init({ deployId })` config (SDK team). Confirm payload shape with BE before implementing Task 5.
