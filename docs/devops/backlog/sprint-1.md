# Sprint 1 DevOps Backlog (Week of May 4 – May 10, 2026)

Sprint goal: Per Jack's direction (first standup, 5/5), this sprint is research/planning + minimal baseline tooling. The point is to land the decisions that Sprint 2 implements, not the implementation itself. Only one piece of real config lands (ESLint baseline) because every other downstream task assumes it.

Sprint type: Design & Prototyping (per project doc).

DevOps team: Jack (Lead), Ethan

---

## How we work

- Each member claims one of the active tasks below based on strength or interest.
- After claiming, create a GitHub Issue and self-assign. (Label and tracking conventions are still TBD.)
- Research deliverables target end of week (~Thursday) to align with the team-wide planning-phase deadline.
- ADRs use MADR format and live under `docs/devops/adr/` (DevOps-area decisions) or `docs/adr/` (architecture-wide decisions, owned with the Tech Lead).
- If you get stuck, post in Slack `#devops` or DM Jack.

---

## Task summary (this sprint)

| #   | Task                                              | Owner | Depends on |
| --- | ------------------------------------------------- | ----- | ---------- |
| 1   | CI/CD platform research + decision ADR            | Jack  |            |
| 2   | Hosting + deploy tooling setup (Cloudflare/wrangler) | Ethan |            |
| 3   | ESLint baseline config (#52)                      | Jack  |            |
| 4   | Branching + PR review conventions                 | Ethan |            |

---

## Tasks

### 1. CI/CD platform research + decision ADR

Owner: Jack

Deliverables:
- `docs/devops/adr/0001-ci-cd-platform.md` (MADR format)
- Comparison of CI/CD options against project constraints: GitHub Actions, CircleCI, GitLab CI (used by some classmates' teams), self-hosted runners.
- Tentative decision with rationale (free tier ceilings, GitHub-native integration, public-repo minutes, secrets handling).

Scope:
- Decision only. No `.github/workflows/*.yml` files this sprint — implementation is Sprint 2 Task 1.
- Cover: lint/test/build job patterns, deploy-on-merge model, secrets storage, runner OS choice (Ubuntu vs Windows — we have Windows devs), public-repo minutes.

Why an ADR: locking in a CI/CD platform shapes every downstream automation. Project doc requires ADRs for all major technical decisions.

Output feeds: Sprint 2 Task 1 (CI workflow), Sprint 2 Task 4 (deploy workflow).

---

### 2. Hosting + deploy tooling setup (Cloudflare/wrangler)

Owner: Ethan

Deliverables:
- Cloudflare account ready (one account hosts production; documented owner + access plan).
- `wrangler` CLI installed locally; `wrangler whoami` succeeds.
- One end-to-end smoke test: deploy a throwaway Hello World worker, verify it appears in dashboard, hit the URL, then delete it.
- `docs/devops/cloudflare-onboarding.md`: how to install wrangler, what the team needs from Cloudflare (D1, Workers, Pages free tiers), account-access plan (who owns the production account, recovery procedure if owner is unreachable).

Scope:
- Single account this sprint. Team-account / multi-developer access is a separate decision; flag it in the onboarding doc as an open question.
- No persistent worker deployed yet — the prototype is teardown-after-verify. Real ingest worker scaffold is Sprint 2 (Backend Task 1).
- D1 creation is not part of this task — defer until ingest worker exists to bind to.

Why first-week: every other devops task assumes Cloudflare + wrangler work. If billing or account access has a gotcha, we want to discover it now, not the day before a sprint demo.

Output feeds: Sprint 2 deploy of the ingest worker, Sprint 2 Task 3 (`workers/api/` scaffold), Sprint 2 Task 4 (deploy workflow needs a working `wrangler` login).

---

### 3. ESLint baseline config (#52)

Owner: Jack
Issue: #52

Deliverables (completed this sprint):
- Root `eslint.config.mjs` with `js/recommended` rules, ignores `node_modules/`, `dist/`, `.wrangler/`.
- Per-worker `workers/ingest/eslint.config.mjs` mirroring the root config.
- `package.json` with `eslint`, `@eslint/js`, `globals` as devDependencies.
- Lint passes against the existing codebase.

Scope:
- Baseline rules only — no project-specific rules, no Prettier integration, no plugin ecosystem (`eslint-plugin-promise`, `eslint-plugin-security`, etc.). Stricter rules can be layered on later; getting an enforceable baseline in now is the win.
- Enforcement in CI is **not** part of this task — that lands in Sprint 2 Task 1 once `.github/workflows/ci.yml` exists.

Open follow-up for Sprint 2: the root config and the worker-local config drift slightly (root has browser + node globals + ignores, worker has only browser globals and no ignores). Decide whether to merge them or keep them deliberately scoped.

---

### 4. Branching + PR review conventions

Owner: Ethan

Deliverables:
- `docs/devops/contributing.md`: branching model (feature branches → PR → main), branch naming convention (`feat/`, `fix/`, `chore/`, `docs/`, `ci/`), PR review requirements, commit message style.
- One-page summary of conventions linked from root README.

Scope:
- Adopt the project doc's >300 LoC review threshold as a hard floor (PRs over that need at least one reviewer outside the author's team).
- Specify which branches require review (`main` yes, feature branches no).
- Specify squash vs merge vs rebase on merge (recommend squash for cleaner history, but flag the trade-off).
- Cover the existing pattern in [docs/backend/README.md](../../backend/README.md) so the conventions are repo-wide, not just DevOps-area.

Why this sprint: Backend is about to land real code in Sprint 2. Without documented conventions, every PR becomes a stylistic negotiation. Lock it in before code volume scales.

Output feeds: every team's PR workflow from Sprint 2 onward.

---

## Future tasks (Sprint 2)

Implementation tasks deferred to Sprint 2 live in [`sprint-2.md`](sprint-2.md):
- CI workflow implementation (closes #53, #54) — depends on Task 1 ADR
- CORS on ingest worker
- Scaffold `workers/api/`
- Deploy workflow + secrets management (closes #56) — depends on Task 2 setup
- CI deploy-event hook (deploy correlation feature)
- Environment separation (#55) and Deployment rollback (#57) — further deferred to Sprint 3

Sprint 2 begins at the next sprint planning meeting (Mon May 11, 4:00 PM).
