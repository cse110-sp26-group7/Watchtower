# ADR-0018: Matrix CI for Per-Worker Build, Test, and Deploy

## Status
Accepted

## Date
2026-05-26

## Context

ADR-0009 split the backend into two Workers (`ingest` and `api`). ADR-0012 gave each Worker its own `package.json` and `package-lock.json`. That structure forces a question on the CI side: do we duplicate the build/test/deploy job definitions per Worker, or parameterise them?

Options:

- **Duplicate jobs** (`build-ingest`, `build-api`, `test-ingest`, `test-api`, `deploy-ingest`, `deploy-api`) — explicit, but six jobs to keep in sync when anything changes. Adding a third Worker means three new jobs.
- **GitHub Actions `strategy: matrix`** — define the job once, parameterise on `worker: [ingest, api]`. One job spec, two parallel runs. Adding a new Worker = one line in the matrix.

Matrix is the obvious choice once you have ≥2 of anything that runs the same script.

## Decision

CI jobs that operate per-Worker use **`strategy: matrix: worker: [ingest, api]`** and inject the value into `working-directory` and `cache-dependency-path`:

```yaml
build:
  runs-on: ubuntu-latest
  strategy:
    matrix:
      worker: [ingest, api]
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: 22
        cache: 'npm'
        cache-dependency-path: workers/${{ matrix.worker }}/package-lock.json
    - name: Install ${{ matrix.worker }} dependencies
      working-directory: workers/${{ matrix.worker }}
      run: npm ci
    - name: Build ${{ matrix.worker }} worker
      working-directory: workers/${{ matrix.worker }}
      run: npx wrangler deploy --dry-run
```

This pattern is applied in three jobs:

- **`build`** in `ci.yml` — `wrangler deploy --dry-run` per Worker.
- **`test`** in `ci.yml` — `npm test` (Vitest, see ADR-0008) per Worker.
- **`deploy`** in `deploy.yml` — `wrangler deploy` per Worker, gated behind the `migrate` job (ADR-0010).

The `lint` job is intentionally **not** matrixed — it runs `npx eslint .` from the repo root because ESLint is configured globally (ADR-0013).

## Consequences

### Positive
- **One job spec, N parallel runs** — adding a third Worker (e.g. `workers/admin`) is a one-line change.
- **Per-package npm cache works correctly** — `cache-dependency-path` is interpolated per matrix entry, so caches don't cross-contaminate.
- **Failures are isolated and labelled** — a red `build (api)` is immediately distinguishable from `build (ingest)` in the GitHub UI.
- **Deploys run in parallel** — `deploy (ingest)` and `deploy (api)` go simultaneously, halving release time.

### Negative
- **Fan-out costs CI minutes** — N Workers means N times the install/setup overhead. With two Workers this is negligible; if we ever had 10+, a shared install step would be worth it.
- **No cross-matrix coordination** — if `deploy (ingest)` succeeds and `deploy (api)` fails, we end up with a partial release. The `migrate` job runs once and gates both, but the deploys themselves are independent. Acceptable given the two-Worker split's blast-radius isolation goal (ADR-0009).
- **`fail-fast` is on by default** — if one matrix leg fails, the other is cancelled. Fine for CI (we want to know about all failures), but for deploys it means one Worker can be left undeployed if the other fails partway. Worth revisiting if it ever bites.

### Out of Scope
- Conditional matrix (`include`/`exclude`) — not needed at two Workers.
- A reusable workflow (`workflow_call`) — overkill for the current footprint.
