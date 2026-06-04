# Sprint 2 DevOps Backlog (Week of May 11 – May 17, 2026)

Sprint goal: Land CI on `main` so Backend can start merging real code with a safety net. Deploy automation and the deploy-event hook are planned here but carried to later sprints once CI is green.

Sprint type: Implementation (per project doc).

DevOps team: Jack (Lead), Ethan

---

## How we work

- One PR per task (smaller diffs over big batches).
- Technical decisions (CI platform, lint config, matrix shape, vitest as test runner) are recorded in [`docs/adr/`](../../adr/), not duplicated here.
- If a task slips, mark Status accordingly and link to the sprint that picks it up.
- If you get stuck, post in Slack `#devops` or DM Jack.

---

## Task summary (this sprint)

| #   | Task                                       | Owner | Status                                                    | Depends on |
| --- | ------------------------------------------ | ----- | --------------------------------------------------------- | ---------- |
| 1   | CI workflow: lint + build + test (#53, #54) | Jack  | Done — shipped on `main`                                  |            |
| 2   | Deploy workflow + secrets (#56)            | Jack  | Carried to Sprint 3 (see [`sprint-3.md`](sprint-3.md))    | #1         |
| 3   | Deploy-event hook                          | Jack  | Carried to Sprint 4 (see [`sprint-4.md`](sprint-4.md))    | #2         |
| 4   | Environment separation (#55)               | Jack  | Deferred to post-MVP                                      | #2         |
| 5   | Deployment rollback (#57)                  | Jack  | Deferred to post-MVP                                      | #4         |

---

## Tasks

### 1. CI workflow: lint + build + test

Owner: Jack
Issues: #53 (build check), #54 (automated tests)
Status: Done — `.github/workflows/ci.yml` merged and required on `main`.

Deliverables (as originally planned):
- One `ci.yml` running on every PR with three jobs: `lint`, `build`, `test`.
- Hosted on GitHub Actions (per [ADR-0019](../../adr/0019-github-actions-as-ci-platform.md)).
- `lint` runs `npx eslint .` from repo root (per [ADR-0013](../../adr/0013-eslint-flat-config.md)).
- `build` and `test` use a matrix over the workers (per [ADR-0018](../../adr/0018-matrix-ci-per-worker.md)).
- Branch protection on `main` requires all three jobs green before merge.

What actually shipped:
- All three jobs landed in one workflow file (commits `d3bf7db`, `1f10052`).
- `build` runs `npx wrangler deploy --dry-run` per worker — validates entry point + bindings without touching Cloudflare.
- `test` job ran the **smoke tests Backend had already written** (Hello World vitest spec on the ingest worker). QA had not produced a test suite yet, so this was the only suite to run; the CI infrastructure is suite-agnostic and will pick up future QA tests automatically.
- Node pinned to 22 after the initial run failed against wrangler 4.x (commit `f186f98`).
- Matrix extended to `workers/api/` once BE scaffolded it (commit `fa98f97`).
- Branch protection enabled: `lint`, `build (ingest)`, `build (api)`, `test (ingest)`, `test (api)` all required.

---

### 2. Deploy workflow + secrets (carried to Sprint 3)

Owner: Jack
Issue: #56
Status: Carried into [`sprint-3.md`](sprint-3.md) Task 1. The trigger model also changed during implementation — see [ADR-0010](../../adr/0010-tag-based-deploys-with-d1-migrations.md).

Deliverables (as originally planned):
- Auto-deploy both workers on push to `main`.
- Cloudflare API token provisioned and stored as a GitHub Secret.
- D1 migrations applied as part of the workflow before the workers deploy.

What actually shipped (in Sprint 3):
- Trigger model switched from "every merge to `main`" to "tag-triggered (`v*`)" — explicit ship-it semantics (rationale in [ADR-0010](../../adr/0010-tag-based-deploys-with-d1-migrations.md)).
- `migrate` job runs once, then `deploy` matrix runs both workers in parallel.
- Token stored as `TOKEN_CICD_V1`, mapped to the `CLOUDFLARE_API_TOKEN` env var that wrangler reads.

---

### 3. Deploy-event hook (carried to Sprint 4)

Owner: Jack
Status: Carried into [`sprint-4.md`](sprint-4.md) Task 1.

Deliverables (as originally planned):
- After both workers deploy successfully, POST a `deploy` event to ingest so the dashboard can correlate errors with deploys.

What actually shipped (in Sprint 4):
- `notify-deploy` job appended to `deploy.yml`, gated on `needs: deploy`.
- Payload matches BE's deploy-event schema.

---

### 4. Environment separation (deferred — post-MVP)

Owner: Jack
Issue: #55
Status: Deferred. Carried as a documented post-MVP item; no work done in Sprints 2–5.

Reason: a staging environment is only meaningful once there's real traffic and a release cadence that benefits from a pre-prod gate. For a class-project demo on a frozen tag, one production environment is sufficient.

---

### 5. Deployment rollback (deferred — post-MVP)

Owner: Jack
Issue: #57
Status: Deferred. Manual procedure (`git revert <merge>` + retag) is the recovery path; documented in [`docs/devops/secrets.md`](../secrets.md) and Sprint 5's runbook.

Reason: automated rollback adds complexity without demo value; the manual procedure is fast enough for a one-shot demo recording.

---

## Sprint 2 outcomes (filled at sprint close)

What landed:
- `.github/workflows/ci.yml` with lint + build + test, matrix over both workers, Node 22.
- Branch protection on `main`: 1 approval + all status checks required + conversations resolved.
- ESLint baseline (slipped from Sprint 1) shipped alongside CI in the same PR.

Not in scope (delegated to other teams):
- CORS preflight + headers on ingest — shipped inside Backend's `/ingest` endpoint PR.
- `workers/api/` scaffold — Backend went past scaffold to a full `GET /api/events` implementation in their own PR.
- DevOps support: extending the CI matrix to cover the new api worker once it landed.
