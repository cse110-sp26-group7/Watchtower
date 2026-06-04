# ADR-0020: Secrets Split Between GitHub Secrets and Cloudflare Worker Secrets

## Status
Accepted

## Date
2026-06-04

## Context

Two distinct kinds of secret-bearing values exist in WatchTower:

1. **CI-time secrets** — values that CI (ADR-0019) needs to talk to external systems. Example: `CLOUDFLARE_API_TOKEN` (stored as GitHub Secret `TOKEN_CICD_V1`), used by `.github/workflows/deploy.yml` to authenticate wrangler against Cloudflare.
2. **Runtime secrets** — values the workers themselves need at request time. Example: `SESSION_SECRET`, used by `watchtower-api` to sign and verify session cookies (ADR-0005).

Each kind has different reach requirements:

- CI-time secrets must be readable by GitHub Actions. The workers don't need them at runtime.
- Runtime secrets must be readable by the worker on every request. CI doesn't need them — and ideally shouldn't have access, since CI logs and workflow steps are a larger blast radius than the worker runtime.

Options considered:

- **One store: everything in GitHub Secrets.** CI reads them directly; runtime secrets get injected into Cloudflare during the deploy job (`wrangler secret put $SESSION_SECRET`). Single source of truth, but every CI run is now a path the runtime secret can leak through (a misconfigured workflow can `echo` it; a compromised marketplace action can exfiltrate it).
- **One store: everything in Cloudflare Worker Secrets.** Wrangler doesn't have a clean way for GitHub Actions to *read* a Cloudflare-stored secret — `wrangler secret list` shows names but not values, and `wrangler secret put` only sets them. CI would need an out-of-band fetch step, which means storing *another* secret in GitHub to authenticate that fetch. Net: the same problem with extra moving parts.
- **Split by usage.** CI-time secrets live in GitHub Secrets; runtime secrets live in Cloudflare Worker Secrets. Each store holds only what its consumer needs.

The split also matches a real ownership boundary. DevOps creates and rotates the Cloudflare API token (a CI concern). The team member shipping the auth feature creates and rotates `SESSION_SECRET` (a worker-runtime concern). The two rotations don't have to coordinate.

## Decision

**Secrets are split by where they are consumed:**

| Secret | Stored in | Consumed by | Set via |
|---|---|---|---|
| `TOKEN_CICD_V1` (Cloudflare API token) | GitHub repo Secrets | `deploy.yml` migrate + deploy jobs | GitHub UI |
| `SESSION_SECRET` (session-cookie HMAC key) | Cloudflare Worker Secrets (on `watchtower-api`) | `watchtower-api` worker at request time | `npx wrangler secret put SESSION_SECRET` |

Conventions:

- **CI-time secrets never become Worker secrets.** The Cloudflare API token is for the deploy pipeline only; the workers don't need it.
- **Runtime secrets never become GitHub Secrets.** If a worker needs it at request time, it goes in Cloudflare via wrangler — not in CI.
- **Secret name vs env var name are separate concerns.** GitHub Secret names can be anything (`TOKEN_CICD_V1`); the workflow maps them to the env var wrangler expects (`CLOUDFLARE_API_TOKEN: ${{ secrets.TOKEN_CICD_V1 }}`). This bit us once during Sprint 3 and is now documented explicitly in [`docs/devops/secrets.md`](../devops/secrets.md).
- **Local development uses `.dev.vars`** for runtime secrets (gitignored, per-worker file). Wrangler loads it for `wrangler dev`.

Operational details (inventory, rotation, recovery, leaked-secret playbook) live in [`docs/devops/secrets.md`](../devops/secrets.md). This ADR captures the underlying split; that file captures the procedures.

## Consequences

### Positive
- **Blast radius is bounded by consumer.** A compromised GitHub Actions run can't exfiltrate `SESSION_SECRET` because it isn't there. A compromised Worker can't deploy itself because it doesn't hold the deploy token.
- **Least privilege by construction** — neither store holds anything its consumer doesn't need.
- **Independent rotation paths.** Rolling the Cloudflare API token doesn't invalidate user sessions. Rolling `SESSION_SECRET` doesn't break CI.
- **Each store's UX is used directly.** GitHub Secret rotation is two clicks in the GitHub UI; Cloudflare secret rotation is one `wrangler secret put`. No glue script in the middle.

### Negative
- **Two stores to manage.** Contributors need to know where each secret lives. Mitigated by [`docs/devops/secrets.md`](../devops/secrets.md) inventory table.
- **Two rotation procedures.** Documented separately in `secrets.md`; the procedures are short, but they're not identical.
- **No unified audit trail.** GitHub has Audit Log; Cloudflare has Audit Log. Investigating a leak means checking both.
- **The secret-name vs env-var-name distinction is easy to get wrong** — caught us once. The fix lives in [ADR-0010](0010-tag-based-deploys-with-d1-migrations.md)-style `env:` mapping in `deploy.yml` and is called out in `secrets.md`.

### Out of Scope
- External secret managers (Vault, AWS Secrets Manager, Doppler) — overkill for a class project with two secrets.
- Per-environment secrets (`SESSION_SECRET_STAGING` vs `_PROD`) — staging is deferred post-MVP (ADR-0010, sprint-5).
- Automatic rotation on a schedule — manual is fine at this scale; `secrets.md` recommends a 6-month TTL on the Cloudflare API token but doesn't enforce it.
- Commit-time secret scanning (gitleaks, trufflehog) — would be a net positive but not required for the demo.
