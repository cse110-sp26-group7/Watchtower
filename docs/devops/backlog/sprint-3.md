# Sprint 3 DevOps Backlog (Week of May 18 – May 24, 2026)

Sprint goal: Land the deploy workflow for both workers so tag pushes (`v*`) take the system from `main` to production end-to-end. Includes D1 migrations gating the deploy and the first real production tag.

Sprint type: Implementation (per project doc).

DevOps team: Jack (Lead), Ethan

---

## How we work

- One PR per task.
- Technical decisions (tag trigger, migrate-then-deploy ordering, matrix shape) are recorded in [`docs/adr/`](../../adr/), not here.
- If you get stuck, post in Slack `#devops` or DM Jack.

---

## Task summary (this sprint)

| #   | Task                                              | Owner   | Status | Depends on |
| --- | ------------------------------------------------- | ------- | ------ | ---------- |
| 1   | Deploy workflow for both workers (#56)            | Jack    | Done   | Sprint 2 CI |
| 2   | First production tag + verification               | Jack    | Done   | #1         |
| 3   | Cross-team coordination (test fixtures, `wt_demo`) | Jack/BE | Done   | BE schema  |

---

## Tasks

### 1. Deploy workflow for both workers

Owner: Jack
Issue: #56
Status: Done — `.github/workflows/deploy.yml` merged; tag pushes deploy both workers automatically.

Deliverables (as originally planned):
- Cloudflare API token provisioned and stored as a GitHub Secret.
- `deploy.yml` with two jobs: `migrate` (D1 migrations) and `deploy` (both workers in parallel).
- `deploy` cannot run unless `migrate` succeeds.
- `notify-deploy` placeholder added; payload implemented in Sprint 4.

What actually shipped:
- Cloudflare API token (Edit Cloudflare Workers + D1:Edit) generated on the team account and stored as GitHub Secret `TOKEN_CICD_V1` (rationale for storing CI-time secrets in GitHub rather than Cloudflare is in [ADR-0024](../../adr/0024-secrets-split-github-and-cloudflare.md)).
- `deploy.yml` shipped with the three-job structure (commit `3425593`); triggered on `push: tags: ['v*']` per [ADR-0010](../../adr/0010-tag-based-deploys-with-d1-migrations.md); matrix over `[ingest, api]` per [ADR-0018](../../adr/0018-matrix-ci-per-worker.md).
- First deploy failed with auth error — the secret was exposed as `TOKEN_CICD_V1` instead of `CLOUDFLARE_API_TOKEN` (the env var wrangler reads). Fixed by mapping `CLOUDFLARE_API_TOKEN: ${{ secrets.TOKEN_CICD_V1 }}` in both `env:` blocks (commit `985b373`). This secret-name vs env-var-name distinction is documented in Sprint 4's [`secrets.md`](../secrets.md) and [ADR-0024](../../adr/0024-secrets-split-github-and-cloudflare.md).
- `concurrency` group added so back-to-back tag pushes queue instead of racing through migrations.
- `notify-deploy` job stubbed; real payload landed in Sprint 4.

---

### 2. First production tag + verification

Owner: Jack
Status: Done.

Deliverables (as originally planned):
- Push a throwaway `v0.0.1-test` tag to validate the pipeline end-to-end.
- Once green, push `v0.1.0` as the first real release.
- Smoke-test the deployed workers from outside the pipeline.

What actually shipped:
- `v0.0.1-test` pipeline run completed green (`migrate` + `deploy (ingest)` + `deploy (api)`). Tag deleted after verification.
- `v0.1.0` shipped as the first real production release.
- Live curl smoke checks confirmed both workers respond on their `*.workers.dev` URLs. (One Windows-specific TLS revocation issue surfaced during smoke testing; investigation carried into Sprint 4 — see [`sprint-4.md`](sprint-4.md) Task 6.)

---

### 3. Cross-team coordination

Owner: Jack (DevOps) + BE
Status: Done.

Two cross-cutting items surfaced during this sprint that DevOps owned coordinating (BE wrote the code):

**`we_demo` vs `wt_demo` typo** — `0002_projects.sql` seeded `we_demo` but the SDK and dashboard referenced `wt_demo`. Schema migrations are immutable once applied, so BE shipped `0003_fix_projects.sql` as a corrective forward migration. DevOps confirmed the migration applied cleanly on the next tag deploy.

**Test fixture seeding for the `projects` table** — Backend's new `project_id` auth check on `POST /ingest` started failing existing vitest tests (the fixtures used `wt_golden`, `wt_idem`, etc., which weren't seeded). BE updated `workers/ingest/test/apply-migrations.js` to `INSERT OR IGNORE` the test fixtures after migrations apply. CI went green again.

Why DevOps coordinated rather than just BE: a red `main` on CI blocks every team's PRs, so it's a cross-cutting concern even though the code change lives in Backend's package.

---

## Out of scope this sprint

- Staging environment (still deferred — post-MVP).
- Automated rollback (still deferred — post-MVP; manual `git revert <merge>` + retag is documented).
- Deploy-event hook (carried to Sprint 4).
- Cloudflare Pages for dashboard (carried to Sprint 4).

---

## Sprint 3 outcomes (filled at sprint close)

What landed:
- `.github/workflows/deploy.yml` — tag-triggered, migrate-before-deploy, matrix over both workers, concurrency-guarded.
- `TOKEN_CICD_V1` GitHub Secret in place; wrangler authenticated correctly via `CLOUDFLARE_API_TOKEN` env var.
- `v0.1.0` shipped as the first real production release through the pipeline.
- Remote D1 has migrations `0001_events.sql`, `0002_projects.sql`, and `0003_fix_projects.sql` applied.
- [ADR-0010](../../adr/0010-tag-based-deploys-with-d1-migrations.md) written to capture the tag-trigger + migration-gating decision.

Retro takeaways:
- Token-name mismatch (secret name vs env var name) was a class of bug worth documenting up front, not after the first failed deploy. Drove the creation of [`secrets.md`](../secrets.md) in Sprint 4.
- Immutable forward-only migrations mean even a one-character typo needs a corrective migration. Added "schema PR review checklist" as a follow-up retro item for Sprint 4.
- Multi-account Cloudflare confusion (personal vs team account, stale wrangler account cache) cost ~30 minutes; noted for future contributors.
- CI `test` job continued to run only Backend's smoke tests this sprint — QA has not contributed unit / integration / E2E tests yet. Infrastructure is ready; the gap is test authorship. Carried as a project-level retro item in [`sprint-5.md`](sprint-5.md).
