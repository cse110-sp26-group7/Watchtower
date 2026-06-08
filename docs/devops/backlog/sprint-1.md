# Sprint 1 DevOps Backlog (Week of May 4 – May 10, 2026)

Sprint goal: Per Jack's direction (first standup, 5/5), this sprint is research/planning + minimal baseline tooling. The point is to land the decisions that Sprint 2 implements, not the implementation itself. Only one piece of real config lands (ESLint baseline) because every other downstream task assumes it.

Sprint type: Design & Prototyping (per project doc).

DevOps team: Jack (Lead), Ethan

---

## How we work

- Each member claims one of the active tasks below based on strength or interest.
- After claiming, create a GitHub Issue and self-assign. (Label and tracking conventions are still TBD.)
- Research deliverables target end of week (~Thursday) to align with the team-wide planning-phase deadline.
- ADRs use MADR format live under `docs\adr`
- If you get stuck, post in Slack `#devops` or DM Jack.

---

## Task summary (this sprint)

| #   | Task                                              | Owner | Status                | Depends on |
| --- | ------------------------------------------------- | ----- | --------------------- | ---------- |
| 1   | CI/CD platform research + decision ADR            | Jack  | Done — see [ADR-0023](../../adr/0023-github-actions-as-ci-platform.md) |  |
| 2   | CloudFlare Setup | Ethan | Account + wrangler ready |  |
| 3   | ESLint baseline config (#52)                      | Jack  | Carried to Sprint 2 — landed alongside CI workflow |  |
| 4   | Branching + PR review conventions                 | Jack | Conventions adopted in practice; formal doc deferred |  |

---

## Tasks

### 1. CI/CD platform research + decision ADR

Owner: Jack
Status: Done — decision recorded in [ADR-0023](../../adr/0023-github-actions-as-ci-platform.md).

Deliverables:
- Decide the whole pipeline we need: Branch protection, Linter Check, Auto Testing, Build Check, Auto deploy Workers/Pages, D1 Migration, Secret Handling.

What actually shipped:
- Created GitHub Issues in GitHub Projects to track each piece of work.
- GitHub Actions chosen as the CI/CD platform; rationale and trade-offs captured in [ADR-0023](../../adr/0023-github-actions-as-ci-platform.md).
---

### 2. Hosting + deploy tooling setup (Cloudflare/wrangler)

Owner: Ethan
Status: Done

Deliverables (as originally planned):
- Cloudflare account ready (one account hosts production; documented owner + access plan).

What actually shipped:
- Cloudflare team account `cse110piedpiper7@gmail.com` created.
- Deployed a throwaway Hello World worker, verify it appears in dashboard, hit the URL, then delete it.
---

### 3. ESLint baseline config (#52)

Owner: Jack
Issue: #52
Status: Carried into Sprint 2. ESLint config and CI integration shipped together in the same PR.

Deliverables (as originally planned):
- Root `eslint.config.mjs` with `js/recommended` rules, ignores `node_modules/`, `dist/`, `.wrangler/`.
- Per-worker `workers/ingest/eslint.config.mjs` mirroring the root config.
- `package.json` with `eslint`, `@eslint/js`, `globals` as devDependencies.
- Lint passes against the existing codebase.

What actually shipped (in Sprint 2):
- Both ESLint configs landed alongside `.github/workflows/ci.yml` rather than standalone in Sprint 1. The lint baseline and its CI enforcement were merged together (commits `73bfcf7`, `1f10052`).
- Root + per-worker configs drift slightly (root has browser + node globals + ignores, worker has browser globals only). Documented as a Sprint 2 open follow-up; not resolved.

---

### 4. Branching + PR review conventions

Owner: Jack
Status: Done

Deliverables (as originally planned):
- The flow is: PR -> CI check -> At least 1 Code Reviewer -> Green -> Merge allowed
                                                          |-> Red -> Merge block 

What actually shipped:
- Using Github rule and applied on Main branch, enabled rule below:
+ Require approvals
+ Dismiss stale pull request approvals when new commits are pushed
+ Allow specified actors to bypass required pull requests: dnhan1707, Lumen98
+ Require branches to be up to date before merging (Status checks that are required build (ingest), lint, tes(ingest))
+ Do not allow bypassing the above settings

---

## Sprint 1 outcomes (filled at sprint close)

What landed:
- Cloudflare team account ready; wrangler authenticated locally for the lead.
- Meeting with all Leaders for TestApp connection - [issue 23](https://github.com/cse110-sp26-group7/Watchtower/issues/23)
- Added ESLint check - [issue 52](https://github.com/cse110-sp26-group7/Watchtower/issues/52)