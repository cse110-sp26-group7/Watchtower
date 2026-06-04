# ADR-0019: GitHub Actions as the CI/CD Platform

## Status
Accepted

## Date
2026-06-04

## Context

The repo lives in GitHub (`cse110-sp26-group7/Watchtower`). Sprint 1 Task 1 was "CI/CD platform research + decision ADR" — the decision was made and acted on (every workflow in `.github/workflows/` is GitHub Actions), but the ADR was never written. Recording it now so the trail from sprint backlog → technical choice is complete.

CI/CD needs for the project:

- Run lint + build + tests on every PR (ADR-0013, ADR-0018, ADR-0008).
- Deploy both workers and run D1 migrations on `v*` tag pushes (ADR-0010).
- Hold one secret (`CLOUDFLARE_API_TOKEN`) and inject it into workflow steps.
- Block merges on red status checks via branch protection.
- Free for a class project on a public-ish team repo.

Options considered:

- **GitHub Actions** — runs inside the same platform that hosts the repo and the PRs. Status checks integrate natively with branch protection. Free runner minutes are generous on public/educational repos. Matrix strategy is first-class.
- **CircleCI** — solid CI product, but a separate auth surface, a separate UI, and a separate secret store. Free tier exists but is more limited for the same workload.
- **Jenkins (self-hosted)** — full control, but somebody has to operate the server. For a class project this is pure cost with no upside.
- **GitLab CI** — would require mirroring the repo to GitLab or moving it entirely. Not worth the disruption.
- **Cloudflare Workers Builds / Pages CI** — Cloudflare has its own build-and-deploy product, but it doesn't run unit tests against a real D1 binding the way `@cloudflare/vitest-pool-workers` does (ADR-0008), and it ties the lint/test loop to a deploy product. Pages uses it for the dashboard, which is fine — but the workers' lint/build/test/deploy loop needs a general-purpose CI.

GitHub Actions is the only option that doesn't add a second platform to the project's operational surface.

## Decision

**GitHub Actions** is the CI/CD platform for everything except the dashboard (which uses Cloudflare Pages' built-in build hook).

Concretely:

- `.github/workflows/ci.yml` — lint + build + test on every PR (ADR-0013, ADR-0018, ADR-0008).
- `.github/workflows/deploy.yml` — tag-triggered migrate + deploy + notify on `v*` (ADR-0010, ADR-0018).
- Branch protection on `main` requires `lint`, `build (ingest)`, `build (api)`, `test (ingest)`, `test (api)` to pass before merge.
- Secrets stored in GitHub repo Settings → Secrets and variables → Actions; exposed to workflows via `${{ secrets.NAME }}`.
- Runner: `ubuntu-latest`, Node pinned to 22 (required by wrangler 4.x).

The dashboard's deploy lives outside this pipeline by design — Cloudflare Pages auto-deploys on push to `main` and serves PR preview URLs without any GitHub Actions involvement. Splitting it off keeps workflow files focused on the workers.

## Consequences

### Positive
- **Zero infrastructure to operate** — no CI server, no agents, no auth surface beyond GitHub itself.
- **Branch protection ties in directly** — required status checks reference job names from the same platform, so the gate is consistent with what runs.
- **Matrix strategy is first-class** (ADR-0018) — one job spec, parameterised over `worker: [ingest, api]`.
- **Free at this scale** — public/educational repos get generous runner minutes; the project never approaches the cap.
- **Secrets store is the same surface as code review** — adding a new secret is in the same UI as adding a collaborator.

### Negative
- **Vendor lock-in to GitHub** — workflows use GitHub-specific syntax (`${{ ... }}`, marketplace actions like `actions/checkout@v4`). Moving to another platform later is a port, not a copy.
- **Runner minute caps on private repos** — would matter if the project went private; doesn't matter today.
- **Marketplace actions are third-party code** — pinning to a major version (`@v4`) is the lightest mitigation; full SHA-pinning is more defensive but adds maintenance.
- **No reusable workflows yet** — `ci.yml` and `deploy.yml` duplicate the Node setup step. Acceptable at two workflows; would be worth refactoring at four or five.

### Out of Scope
- Self-hosted runners (no reason to pay the operational cost).
- Reusable workflows (`workflow_call`) — overkill for current footprint.
- CodeQL / Dependabot integrations — gold-plating for a class project.
- Migrating dashboard deploys into GitHub Actions — Cloudflare Pages' built-in deploy is simpler and gives free preview URLs.
