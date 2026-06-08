# Sprint 4 DevOps Backlog (week of May 25 – June 1, 2026)

DevOps team: Jack, Ethan

Inputs from Sprint 3:
- `.github/workflows/deploy.yml` shipped — tag-triggered, migrate-then-deploy ordering, matrix on `[ingest, api]`, concurrency-guarded.
- `TOKEN_CICD_V1` GitHub Secret + Cloudflare API token in place, scoped to team account.
- First production releases shipped (`v0.0.1-test` for pipeline validation, `v0.1.0` as first real release).
- Remote D1 has migrations `0001_events.sql` and `0002_projects.sql` applied.
- `notify-deploy` job still a placeholder — needs payload + ingest URL.
- `wt_demo` confirmed as the canonical project ID; `we_demo` typo retired via BE follow-up migration.

---

## How we work

- Sprint 4 is feature-heavy across teams (auth, alerts, summary view from BE/FE). DevOps mostly **supports** rather than ships standalone new infra.
- One PR per task; smaller diffs over big batches.
- If blocked, post in Slack `#devops` or DM Jack.

---

## Task summary

| #   | Task                                                  | Owner | Issue   | Depends on |
| --- | ----------------------------------------------------- | ----- | ------- | ---------- |
| 1   | Deploy-event hook (Sprint 2 Task 5 carryover)         | Jack  | (new)   | deploy.yml |
| 2   | Cloudflare Pages for dashboard                        | Jack  | (new)   |            |
| 3   | Smoke script project_id alignment (`wt_smoke` → `wt_demo`) | Jack | (new) | #1 (uses same project) |
| 4   | `docs/devops/secrets.md` — secrets inventory + rotation | Jack | (new)   |            |
| 5   | Tag `v0.2.0` release with deploy-event hook live      | Jack  | (new)   | #1, #2     |
| 6   | Coordinate with BE on TLS / CORS / browser-blocking debug | Jack | (new) |            |
| 7   | Environment separation (deferred — post-MVP)          | Jack  | #55     | post-MVP   |
| 8   | Deployment rollback (deferred — post-MVP)             | Jack  | #57     | post-MVP   |

---

## Tasks

### 1. Deploy-event hook

Owner: Jack
Issue: (new) — `devops/deploy-event-hook`

Carryover from Sprint 2 Task 5. After both workers deploy successfully, POST a `deploy` event to the ingest worker so the dashboard can correlate errors with deploys.

Deliverables:
- New `notify-deploy` job appended to `deploy.yml`, with `needs: deploy`
- Job uses curl to POST a deploy event matching `docs/backend/api/event-schema-draft.md` Deploy event shape (event_id, project_id, event_type, timestamp, environment, deploy_id from `$GITHUB_SHA`, version from `$GITHUB_REF_NAME`)
- `project_id` is `wt_demo` (the seeded one)
- `curl -fsS` so non-2xx responses fail the workflow loudly

Scope:
- Covers WatchTower observing its own deploys (dogfooding for the demo)
- For external test apps, the SDK + CLI handle deploy reporting separately — not this task

Why this sprint: closes the architecture's headline question "which deploy started the fire?" by giving the dashboard real deploy events to correlate against.

Depends on: `deploy.yml` from Sprint 3, BE schema accepting `event_type='deploy'` (already done).

---

### 2. Cloudflare Pages for dashboard

Owner: Jack
Issue: (new)

Frontend currently has no automated deployment. Per ARCHITECTURE.md §3.5 the dashboard belongs on Cloudflare Pages.

Deliverables:
- Cloudflare dashboard → Workers & Pages → Create application → Pages → Connect to Git
- Repo: `cse110-sp26-group7/Watchtower`, branch `main`, build dir `dashboard`, no build command (vanilla JS per ADR-0003)
- Verify deploy at `watchtower-dashboard.pages.dev`
- Confirm dashboard fetches succeed against live workers (FE may need to swap localhost URLs for live ones)
- No GitHub Actions changes — Pages handles its own CI loop

Scope:
- Production-only (no preview branches restriction; PRs get free preview URLs)
- No custom domain — `*.pages.dev` is fine for class project

Why this sprint: unblocks every FE demo. Without it, dashboard demos require `npm run dev` on a local machine.

---

### 3. Smoke script project_id alignment

Owner: Jack
Issue: (new)

Both `workers/ingest/scripts/smoke.sh` and `workers/api/scripts/smoke.sh` default to `PROJECT=wt_smoke`, which isn't seeded in the `projects` table → smoke runs against deployed prod always 401 at the first POST.

Deliverables:
- Update both smoke scripts to default to `PROJECT=wt_demo`
- Verify smoke runs cleanly against deployed prod
- Tiny PR, easy review

Scope:
- Doesn't seed `wt_smoke` (keeps the projects table lean)
- Could be revisited if we want separate smoke-test isolation later

Note: this task ended up de-prioritized to free up Sprint 4 focus for higher-impact items; carries into Sprint 5 if not completed.

---

### 4. `docs/devops/secrets.md`

Owner: Jack
Issue: (new) — `document/devops-secrets-management`

Document what secrets exist, where they live, how to rotate, what isn't a secret.

Deliverables:
- `docs/devops/secrets.md` with: secret inventory (`TOKEN_CICD_V1`), rotation procedure, recovery plan, leaked-secret playbook, what's NOT secret (DB IDs, worker URLs, account ID)
- Forward-references future `SESSION_SECRET` (Sprint 4 auth carryover or Sprint 5)
- Row labels kept tool-agnostic (`Exposed at runtime as` instead of `Exposed to wrangler as`) so the template fits future secret types

Why this sprint: post-breach hygiene, bus-factor mitigation. Ticks Sprint 5 DoD checkbox for "CI/CD pipeline documented in `docs/devops/`."

---

### 5. Tag `v0.2.0` with deploy-event hook live

Owner: Jack
Issue: (new)

First release that exercises the full pipeline including `notify-deploy`. Includes `/api/summary` from BE.

Deliverables:
- Tag `v0.2.0` on `main`
- Verify all 4 jobs green: `migrate` + `deploy (ingest)` + `deploy (api)` + `notify-deploy`
- Verify a fresh deploy event row in the `events` table with `deploy_id` matching the v0.2.0 SHA
- Confirm dashboard can query the new deploy event via `/api/events?type=deploy`

Depends on: Task 1 (hook) and Task 2 (Pages) merged.

---

### 6. Coordinate browser/network debugging with FE

Owner: Jack
Issue: ad-hoc

FE reported "CORS error" on the deployed api worker (`Status code: (null)`). Triage revealed it was actually a TLS revocation check failure (Windows schannel + Firefox), not a real CORS issue — the worker's CORS config is correct.

Deliverables:
- Diagnosis runbook (Cloudflare workers.dev URLs may fail on networks that block OCSP/CRL endpoints; Firefox surfaces TLS failures as CORS)
- Workarounds documented for FE: Chrome instead of Firefox, mobile hotspot to test, `security.OCSP.enabled=0` in Firefox `about:config`
- For demo machine, pre-test on demo network

Why this sprint: surfaces a class of "looks like our bug but isn't" so it's not repeated.

---

### 7 & 8. Environment separation + Deployment rollback (still deferred)

Both items remain deferred to post-MVP. Manual procedure for rollback (`git revert <merge>` + retag) is sufficient for class-project demo. Documenting the manual procedure in Sprint 5's runbook.

---

## Out of scope this sprint

- Grafana / external observability — Cloudflare's built-in observability is sufficient
- Slack deploy notifications — nice-to-have, not demo-critical
- Coverage gates / Dependabot / CodeQL — gold-plating for a class project
- Custom domain on workers (`*.workers.dev` is fine)

## Retro notes

- Browser-blocking workers.dev was a hidden risk; demo-network test should be standard pre-demo procedure (move to Sprint 5).
- `wt_demo` vs `we_demo` typo cleanup unblocked the deploy-event hook task.
- BE coordinating session-secret needs (Task 9 cutover) lands in Sprint 5 — anticipated; secrets.md already plans for it.
- CI `test` job still runs only Backend's smoke tests — no unit / integration / E2E suite from QA has appeared in Sprints 2, 3, or 4. Carried as a project-level retro item in [`sprint-5.md`](sprint-5.md).
