# ADR-0006: WatchTower CLI and SDK Distribution Strategy

## Status
Proposed

## Date
2026-05-10

## Context

WatchTower is a centralized observability platform that collects errors, performance vitals, feedback, and deploy events from customer applications. The team needs to decide how customers integrate WatchTower into their projects with minimal friction and zero infrastructure knowledge required on their end.

The original plan of building internal test apps was replaced with a strategy that targets real external repositories as customers. This means the integration experience needs to be polished, simple, and self-contained.

## Decision

We will ship WatchTower as two separate but related artifacts:

1. **A CLI tool** (`@watchtower/cli`) published to the npm registry, invoked via `npx`
2. **A browser SDK** (`watchtower.js`) that the CLI drops into the customer's project

These two artifacts together cover the full customer onboarding experience without requiring the customer to understand anything about Cloudflare, D1, or our internal infrastructure.

---

## CLI Tool (`@watchtower/cli`)

### Structure

```
cli/
  package.json         ← defines CLI entry point
  bin/
    cli.js             ← routes commands, no business logic
  commands/
    create.js          ← handles: npx watchtower create
    deploy.js          ← handles: npx watchtower deploy
  sdk/
    watchtower.js      ← browser SDK template, copied to customer project
```

### `package.json`

Declares the package as a CLI tool by setting the `bin` field, pointing npm to `bin/cli.js` as the executable entry point.

### `bin/cli.js`

- First line is `#!/usr/bin/env node` so the OS runs it with Node
- Uses `commander` to register valid subcommands
- Routes `create` and `deploy` to their respective handlers
- Contains no business logic itself

### `commands/create.js`

Runs when customer executes `npx watchtower create`. Responsibilities:

1. Prompts customer for project name and environment
2. Calls `POST /api/projects` on our Cloudflare Worker to register the project
3. Receives `project_id` back from the API
4. Copies `sdk/watchtower.js` into the customer's current working directory
5. Prints the `init()` snippet they need to add to their app's JS entry point

Note: `project_id` is a **public identifier**, not a secret. It is safe to commit directly into app code, consistent with how Sentry and PostHog handle their public keys. It does not need to go into `.env`.

### `commands/deploy.js`

Runs when customer executes `npx watchtower deploy`. Responsibilities:

1. Reads `WATCHTOWER_PROJECT_ID` from their `.env`
2. Generates a GitHub Actions workflow file (`watchtower.yml`)
3. Writes it to `.github/workflows/watchtower.yml` in their project
4. Prints instructions to add `WATCHTOWER_PROJECT_ID` to their GitHub repository secrets

---

## Browser SDK (`watchtower.js`)

A plain JavaScript file (no build step, no npm install required) that is copied into the customer's project by the CLI. It exposes a `WatchTower` class with the following responsibilities:

- `init()` — sets up all automatic listeners
- `watchErrors()` — attaches `window.onerror` and `unhandledrejection` listeners
- `watchPerformance()` — uses `PerformanceObserver` to capture Web Vitals (LCP, FCP, TTFB, CLS, INP)
- `injectFeedbackWidget()` — renders a lightweight rating widget on the page
- `captureError(err)` — public method for manually reporting caught errors
- `send(event)` — assembles the full event envelope and ships it via `navigator.sendBeacon`

The Cloudflare Worker ingest URL is hardcoded inside the SDK. Customers never see or configure it.

---

## Customer Integration Flow

### Step 1 — Register project
```bash
npx @watchtower/cli create
```
CLI prompts for project name, registers with WatchTower API, drops `watchtower.js` into their folder, writes `project_id` to `.env`.

### Step 2 — Initialize WatchTower in their app

The CLI prints the following after `create` completes:

```
✅ Project created! project_id: wt_a1b2c3d4

Add this to your app's JS entry point (e.g. main.js, app.js, index.js):

  function init() {
    const wt = new WatchTower({ projectId: "wt_a1b2c3d4" })
    wt.init()
  }

Note: project_id is a public identifier, safe to commit to your repo.
```

`project_id` is intentionally hardcoded in app JS — not read from `.env` — because plain HTML projects have no build step to inject environment variables, and `project_id` is not a secret. This matches the standard pattern used by Sentry and PostHog.

### Step 3 — Set up deploy tracking
```bash
npx @watchtower/cli deploy
```
CLI generates `.github/workflows/watchtower.yml` in their repo. Customer adds `WATCHTOWER_PROJECT_ID` to their GitHub repository secrets.

From this point:
- Errors and performance vitals are reported automatically
- Every push to their `main` branch sends a deploy event to WatchTower
- The dashboard correlates errors to deploys by timestamp and `deploy_id`

---

## Data Flow

```
Customer app (their browser)
  → watchtower.js catches error / perf / feedback
  → sendBeacon → POST /ingest (Cloudflare Worker)
  → Worker validates, enriches, inserts into D1

Customer CI/CD (their GitHub Actions)
  → watchtower.yml fires on push to main
  → POST /ingest with deploy event (git SHA, author, branch)
  → Worker inserts into D1 deploys table

WatchTower Dashboard
  → GET /api/* (Cloudflare Worker)
  → Worker queries D1
  → Dashboard displays errors correlated to deploys
```

---

## Publishing Strategy

The CLI is published as a scoped npm package:

```bash
cd cli
npm publish --access public
```

Package name: `@watchtower/cli`

For local development and team testing before publishing:

```bash
cd cli
npm link

# then anywhere on the machine:
watchtower create
```

Only the `cli/` folder is published to npm. The `worker/`, `dashboard/`, and `schema.sql` stay in the GitHub repo and deploy to Cloudflare via GitHub Actions.

---

## Consequences

### Positive
- Zero infrastructure knowledge required from customers
- Works with any type of web project (plain HTML, React, Vue, etc.)
- No `npm install` required in the customer's project for the SDK
- `deploy_id` is optional on browser events — customers who omit it still get timestamp-based correlation
- CLI can be tested locally with `npm link` before publishing

### Negative
- Cloudflare Worker URL is hardcoded in `watchtower.js` — changing it requires re-running `npx watchtower create`
- Customer must manually add one GitHub secret after running `deploy`
- CLI must be republished to npm for every update to `watchtower.js`

### Out of Scope
- Authentication / API keys for the customer (not required for this class project)
- Auto-updating the SDK in existing customer projects
- Supporting non-GitHub CI/CD pipelines (GitLab, Bitbucket, etc.)