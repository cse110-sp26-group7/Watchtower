# WatchTower QA Test Plan

- **Author:** QA Team (Benny Signer)
- **Sprint:** 2 (2026-05-11 – 2026-05-18)
- **Status:** Draft — pending SM review
- **Tracks:** Issue [#46](https://github.com/cse110-sp26-group7/Watchtower/issues/46)

---

## 1. Overview

WatchTower is a lightweight observability dashboard. Three sources of data flow into one pipeline:

```
Client SDK (watchtower.js)  ──┐
                               ├──▶  POST /ingest  ──▶  D1 (SQLite)  ──▶  GET /api/*  ──▶  Dashboard SPA
GitHub Actions (CI/CD)     ──┘
```

QA is responsible for verifying correctness end-to-end: from the raw HTTP contract at `/ingest`, through the API layer, to what the developer actually sees in the dashboard.

---

## 2. Scope

### In scope

| Component | Notes |
|---|---|
| Ingest Worker (`workers/ingest`) | Input validation, enrichment, idempotency, CORS, error responses |
| API Worker (`workers/api`) | Auth, all GET endpoints, ownership checks |
| Client SDK (`client/watchtower.js`) | Error capture hooks, performance observer, feedback widget, batch flush |
| Dashboard SPA (`dashboard/`) | All routes, filters, charts, empty states, time range selector |
| CI Pipeline (`.github/workflows/ci.yml`) | Lint, unit tests, E2E gate on every PR |

### Out of scope (MVP)

- Source-map symbolication
- Alerting integrations (Slack, email)
- Multi-region behavior
- Native mobile SDKs
- Long-term data retention (>30 days)

---

## 3. Testing Levels

### 3.1 Unit Tests

**Tool:** Vitest + `@cloudflare/vitest-pool-workers`  
**Location:** `workers/ingest/test/`, `workers/api/test/`  
**When they run:** Every PR via GitHub Actions  
**D1 binding:** Mocked using the workers test pool (no live Cloudflare account needed)

These tests call the Worker handler directly with a constructed `Request` object and assert on the `Response`. They are fast (<5s total) and are the first gate in CI.

### 3.2 Integration Tests

**Tool:** Vitest + `@cloudflare/vitest-pool-workers` (local D1 binding)  
**Location:** `workers/ingest/test/integration/`, `workers/api/test/integration/`  
**When they run:** Every PR  
**Setup:** `db/schema.sql` applied via `wrangler d1 execute --local` before the test suite runs

Unlike unit tests these exercise the full validate → enrich → INSERT → SELECT round-trip with a real local SQLite. Each test runs inside a transaction that is rolled back on teardown so tests are isolated.

### 3.3 E2E Tests

**Tool:** Playwright (headless Chromium)  
**Location:** `e2e/`  
**When they run:** Every PR (runs after unit + integration pass)  
**Setup:** `wrangler dev` started as a background process; Playwright points at `http://localhost:8787`

These are the slowest tests and the only ones that exercise the dashboard UI. They map directly to the acceptance criteria in the user stories.

### 3.4 Manual Acceptance Testing

**When:** End of each sprint, against the Cloudflare Pages preview URL for that branch  
**Tracked in:** `docs/qa/acceptance-checklist.md` (one file per sprint)  
**Owner:** QA team member runs through checklist and updates the Status column in each story file

---

## 4. Test Coverage Matrix

Each row maps an acceptance criterion (from the user stories) to the test(s) that cover it.

| Acceptance Criterion | Story | Test Layer | Test File (planned) |
|---|---|---|---|
| `/ingest` returns 204 for a valid batch | — | Unit | `ingest.validation.spec.js` |
| Missing `project_id` → 401 | — | Unit | `ingest.validation.spec.js` |
| Unknown `project_id` → 401 | — | Unit | `ingest.validation.spec.js` |
| Malformed JSON → 400 | — | Unit | `ingest.validation.spec.js` |
| `event_type` not in enum → 400 | — | Unit | `ingest.validation.spec.js` |
| `environment` not in enum → 400 | — | Unit | `ingest.validation.spec.js` |
| `timestamp` not ISO 8601 → 400 | — | Unit | `ingest.validation.spec.js` |
| Batch > 100 events → 413 | — | Unit | `ingest.limits.spec.js` |
| Body > 1 MB → 413 | — | Unit | `ingest.limits.spec.js` |
| Duplicate `event_id` replayed → 204, no duplicate row | — | Integration | `ingest.idempotency.spec.js` |
| CORS `OPTIONS` preflight → 204 with correct headers | — | Unit | `ingest.cors.spec.js` |
| Partial-batch failure → 400 with `error_at` index | — | Unit | `ingest.validation.spec.js` |
| `feedback_rating` outside 1–5 → 400 | — | Unit | `ingest.validation.spec.js` |
| `POST /api/login` valid → 200 + session cookie | — | Unit | `auth.spec.js` |
| `POST /api/login` wrong password → 401 | — | Unit | `auth.spec.js` |
| Protected endpoint without cookie → 401 | — | Unit | `auth.spec.js` |
| `GET /api/events?type=error` returns only errors | — | Integration | `events.spec.js` |
| `GET /api/events` cursor pagination works | — | Integration | `events.spec.js` |
| `GET /api/events/:id` returns `related.deploy` | — | Integration | `events.spec.js` |
| `GET /api/summary` reflects correct totals per window | — | Integration | `summary.spec.js` |
| Accessing another user's project → 403 | — | Unit | `auth.spec.js` |
| Dashboard loads within 1–2s | Data Collection S1 | E2E | `dashboard.spec.js` |
| Errors visually distinct from non-error events | Data Collection S1 | E2E | `dashboard.spec.js` |
| Dashboard displays last 50 errors | Data Collection S1 | E2E | `dashboard.spec.js` |
| Each error shows timestamp, type, frequency, source | Data Collection S1 | E2E | `dashboard.spec.js` |
| Time range selector updates all panels | Data Collection S1 | E2E | `dashboard.spec.js` |
| Empty state shown when no errors exist | Data Collection S1 | E2E | `dashboard.spec.js` |
| Feedback entries show rating + message + source page | Data Collection S2 | E2E | `dashboard.spec.js` |
| Empty state shown when no feedback exists | Data Collection S2 | E2E | `dashboard.spec.js` |
| Log entries show message, type, timestamp, page | Log Viewer S1 | E2E | `log-viewer.spec.js` |
| Search by event type filters correctly | Log Viewer S1 | E2E | `log-viewer.spec.js` |
| Logs displayed in JSON format | Log Viewer S1 | E2E | `log-viewer.spec.js` |
| Error logs visually highlighted | Log Viewer S1 | E2E | `log-viewer.spec.js` |
| Empty state when search returns no results | Log Viewer S1 | E2E | `log-viewer.spec.js` |
| Deploy list shows timestamp and version | Log Viewer S2 | E2E | `log-viewer.spec.js` |
| Deployments shown alongside error timeline | Log Viewer S2 | E2E | `log-viewer.spec.js` |
| Clicking deploy shows errors that appeared after it | Log Viewer S2 | E2E | `log-viewer.spec.js` |
| Error frequency graph updates when new errors triggered | Data Visualizer S1 | E2E | `data-viz.spec.js` |
| Chart shows breakdown of error types with labels | Data Visualizer S1 | E2E | `data-viz.spec.js` |
| Satisfaction rating trend updates on new submissions | Data Visualizer S1 | E2E | `data-viz.spec.js` |
| All graphs follow consistent color scheme | Data Visualizer S1 | E2E (visual snapshot) | `data-viz.spec.js` |
| Empty state per graph before any data is sent | Data Visualizer S1 | E2E | `data-viz.spec.js` |

---

## 5. Test Environments

| Environment | Purpose | How to access |
|---|---|---|
| Local (`wrangler dev`) | Unit + integration + E2E during development | `npm run dev` inside each worker dir |
| CI (GitHub Actions `ubuntu-latest`) | Gate on every PR to `main` | Automatic |
| Staging (Cloudflare Pages preview) | Manual acceptance testing per sprint | URL from the PR "Deployments" panel |
| Production | Smoke test after merge to `main` | `https://watchtower.pages.dev` (TBD) |

---

## 6. CI Pipeline (Target State)

```yaml
jobs:
  lint:        # npx eslint . — already in place
  unit-tests:  # cd workers/ingest && npm test; cd workers/api && npm test
  e2e:         # playwright test — depends on unit-tests passing
  build:       # wrangler deploy --dry-run — depends on lint passing
```

**Current gap:** The `ci.yml` has a typo (`npm isntall`) and only runs linting. Adding `unit-tests` and `e2e` jobs is a Sprint 2 stretch goal (DevOps owns the CI setup; QA owns the test files that CI runs).

---

## 7. Test File Structure

```
workers/
  ingest/
    test/
      ingest.validation.spec.js     ← all /ingest HTTP contract tests
      ingest.limits.spec.js         ← 413 batch size / body size tests
      ingest.cors.spec.js           ← CORS preflight and response headers
      integration/
        ingest.idempotency.spec.js  ← duplicate event_id with real D1
        ingest.roundtrip.spec.js    ← POST then GET confirms row exists
  api/
    test/
      auth.spec.js                  ← login, session cookie, 401/403
      events.spec.js                ← GET /api/events filtering + pagination
      summary.spec.js               ← GET /api/summary counts + windows
      deploys.spec.js               ← GET /api/deploys filtering
      integration/
        events.spec.js              ← full POST /ingest → GET /api/events
e2e/
  dashboard.spec.js
  log-viewer.spec.js
  data-viz.spec.js
docs/
  qa/
    test-plan.md                    ← this file
    acceptance-checklist.md         ← manual sprint-end checklist
```

---

## 8. Definition of Done for QA (Sprint 2)

| Criterion | Verification Method | Status |
|---|---|---|
| Test plan written and reviewed | SM approves this document | Not Ready |
| Ingest validation tests written (even if red) | `npm test` in `workers/ingest/` runs without crashing | Not Ready |
| CI `lint` job typo fixed | PR to `main` runs lint successfully | Not Ready |
| CI `unit-test` job added | PR to `main` runs `npm test` in workers | Not Ready |

---

## 9. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Backend Worker not implemented yet | Ingest/API tests will all fail (red) until BE writes code | Write tests now as a spec; BE codes to make them green |
| Dashboard is an empty file | E2E tests blocked until FE has a shell | Defer E2E setup to Sprint 3; write test files now with `test.todo()` stubs |
| D1 local binding requires `wrangler` installed | CI setup complexity | DevOps (Nhan) owns CI; QA provides `npm test` script that works locally |
| Cloudflare Workers API surface differs from Node | Tests must use `@cloudflare/vitest-pool-workers`, not plain Node | Already configured in `workers/ingest/vitest.config.js` — use as template for `workers/api/` |

---

## 10. References

- [ARCHITECTURE.md](../ARCHITECTURE.md) — system design, CI/CD plan (§3.6)
- [endpoints-draft.md](../backend/api/endpoints-draft.md) — full HTTP contract, status codes, rate limits
- [event-schema-draft.md](../backend/api/event-schema-draft.md) — all event types and required fields
- [data-collection.md](../stories/data-collection.md) — acceptance criteria for dashboard + feedback
- [log-viewer.md](../stories/log-viewer.md) — acceptance criteria for log viewer + deploy correlation
- [data-visualizer.md](../stories/data-visualizer.md) — acceptance criteria for charts
- [sprint-2.md](../sprints/sprint-2.md) — sprint board (QA task: Issue #46, due 05-16)
