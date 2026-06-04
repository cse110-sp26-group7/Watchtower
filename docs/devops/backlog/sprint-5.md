# Sprint 5 DevOps Backlog (week of June 1 – June 8, 2026)

DevOps team: Jack, Ethan

Inputs from Sprint 4:
- Deploy-event hook merged and firing on every tag (`notify-deploy` job in `deploy.yml`).
- Cloudflare Pages live for the dashboard at `watchtower-dashboard.pages.dev` — auto-deploys on push to `main`, free preview URLs per PR.
- `docs/devops/secrets.md` committed — secret inventory + rotation runbook.
- `v0.2.0` shipped end-to-end with full pipeline (`migrate` → `deploy` matrix → `notify-deploy` → real deploy event in D1).
- Browser/network debug runbook documented for FE: workers.dev TLS-revocation issues can present as fake CORS errors.

Sprint 5 is the final sprint. Scope priority: **demo readiness > documentation polish > new infrastructure**. No new infra unless it directly enables the demo.

---

## How we work

- One PR per task.
- Feature-freeze 36 hours before the demo recording — only doc / cosmetic PRs after that.
- Demo dry-run on the actual demo machine + demo network at least once mid-sprint.
- If blocked, post in Slack `#devops` or DM Jack.

---

## Task summary

| #   | Task                                                  | Owner | Issue   | Depends on |
| --- | ----------------------------------------------------- | ----- | ------- | ---------- |
| 1   | Provision `SESSION_SECRET` for auth (BE Task 9 cutover) | Jack | (new)   | BE auth PR |
| 2   | Update README to reflect shipped system               | Jack  | (new)   |            |
| 3   | Environment separation (still deferred — post-MVP)    | Jack  | #55     | post-MVP   |
| 4   | Deployment rollback (still deferred — post-MVP)       | Jack  | #57     | post-MVP   |

---

## Tasks

### 1. Provision `SESSION_SECRET`

Owner: Jack
Issue: (new)
Status: Done

When BE's auth cutover lands (Task 9 — `feat(api): gate /api/* behind session cookie`), the `watchtower-api` worker needs `SESSION_SECRET` set as a Cloudflare Worker secret. Login fails without it.

Deliverables:
- Generate value: `openssl rand -hex 32`
- Set on prod via `npx wrangler secret put SESSION_SECRET` from `workers/api/`
- Verify with `npx wrangler secret list`
- Update `docs/devops/secrets.md` — move `SESSION_SECRET` from "Future secrets" to "Active secrets" with full row template
- Confirm with BE whether ingest worker also needs it (probably not — auth is read-side)
- Local devs set their own value in `workers/api/.dev.vars` (gitignored)

Scope:
- One value, not shared across env (rotation invalidates all active sessions — acceptable for class project)
- Not a GitHub Secret — never touches CI, lives only in Cloudflare

Why this sprint: BE auth cutover blocks on this. Provision on the day they ask.

---

### 2. Update README

Owner: Jack
Issue: (new)
Status: Done

The root README is from Sprint 1–2 era. Sprint 5 DoD requires it match shipped reality.

Deliverables:
- Updated "Deployed Endpoints" section with ingest URL, api URL, dashboard Pages URL
- Updated "Quickstart" with current local-dev flow (npm install per worker, wrangler dev, etc.)
- Links to `docs/devops/secrets.md`, `docs/devops/backlog/`, `docs/ARCHITECTURE.md` for onboarding
- Remove references to features that didn't ship (or moved post-MVP)
- Demo video link added once recorded (Task 4)

Why this sprint: highest rubric-impact doc on the project. Easier to write while system state is stable.


---

### 3 & 4. Environment separation + Deployment rollback (deferred — post-MVP)

Owner: Jack
Issues: #55, #57

Both remain explicitly deferred. Class-project demo is a one-shot recording on a frozen `v1.0.0-demo` tag — sophisticated rollback adds complexity without demo value. Manual procedure (`git revert <merge>` + retag) is sufficient and documented in `docs/devops/secrets.md` / runbook.

Carry as documented "post-MVP" items for any future maintainers picking up the project.

---

## Out of scope this sprint

- Grafana / external observability stack
- Slack deploy notifications
- Coverage gates / security scanning (CodeQL, Dependabot)
- Custom domains
- Multi-region D1 replication

All real concerns for production systems; none of them improve the demo or move rubric needles. Avoid scope creep.

## Cross-team coordination

- **BE**: SESSION_SECRET provisioning timing depends on Task 9 auth PR. Ping Jack the day before cutover.
- **FE**: confirm dashboard handles "not logged in" state gracefully once auth gates `/api/*`.
- **QA**: regression test on the frozen demo tag before the recording.
- **All teams**: contribute to project retrospective by end of week.

## Retro notes (collected at end of sprint)

### Test suite never grew past Backend's smoke tests

Throughout the project (Sprints 2–5), the `test` job in `.github/workflows/ci.yml` ran the same suite: Backend's vitest spec on `workers/ingest/`, later extended to `workers/api/` once that worker landed. QA never produced unit, integration, or E2E tests on top of that, so the CI test gate stayed thin from the day it was set up until the demo.

What this meant in practice:
- CI infrastructure was suite-agnostic and ready — adding a new `*.spec.js` file under either worker would have been picked up automatically by the matrix. The gap was test authorship, not test plumbing.
- The smoke tests Backend wrote covered enough of the request paths that no production regression slipped through during Sprints 3–5, so the thin suite didn't bite us. Lucky, not designed.
- Coverage thresholds, integration-style flows (SDK → ingest → API → dashboard), and any E2E scenario remained un-tested in CI. We caught regressions by curl and by eye, not by an automated suite.

Why this is a DevOps retro item and not just a QA one:
- DevOps owned the `test` job in CI and the branch-protection rules that made it required. We could have escalated the test-deficit earlier — e.g., by adding a coverage gate that would have visibly failed on every PR, forcing the conversation.
- Instead we treated "the test job is green" as sufficient, which it was technically (the suite passed) but not substantively (the suite was tiny).

Lessons for future projects:
- When CI is set up before tests exist, agree explicitly on who owns growing the suite and by when. "QA will write them eventually" is not a plan.
- Consider landing a coverage threshold (even at a low number like 30%) early — a measurable floor makes test-deficit visible to every PR author, not just whoever runs the test job.
- Separate "infrastructure to run tests" from "tests that exist" in sprint planning — they're independent deliverables and one shouldn't gate the other.
