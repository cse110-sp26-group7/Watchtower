# DevOps Secrets

Inventory of secrets used by WatchTower infrastructure, where they live,
and how to rotate them.

---

## Active secrets

### `TOKEN_CICD_V1`

| Property | Value |
|---|---|
| **What** | Cloudflare API token used by `.github/workflows/deploy.yml` |
| **Stored in** | GitHub repo → Settings → Secrets and variables → Actions → `TOKEN_CICD_V1` |
| **Exposed to wrangler as** | env var `CLOUDFLARE_API_TOKEN` (see deploy.yml `env:` block) |
| **Scope** | Cloudflare account `Cse110piedpiper7@gmail.com` only |
| **Permissions** | Workers Scripts: Edit · D1: Edit · Account Settings: Read · Workers KV / R2 / Tail (template defaults) |
| **Token name in Cloudflare dashboard** | `holy-water-5e69` (consider renaming to `github-actions-deploy`) |
| **Expiration** | No expiration set |
| **Used by** | `.github/workflows/deploy.yml` (migrate job + both deploy matrix jobs) |

---

## Rotation procedure

1. Cloudflare dashboard → **My Profile** → **API Tokens**
2. Find the token by name → **Roll** (rotates value, keeps permissions) or **Delete** + create new
3. New token is shown **once** — copy it immediately
4. GitHub → Settings → Secrets and variables → Actions → click `TOKEN_CICD_V1` → **Update** with new value
5. No code changes needed — `deploy.yml` references the same secret name
6. Verify by tagging a test release (`vX.Y.Z-test`) and confirming the workflow deploys both workers; delete the test tag after

---

## Recovery plan (if Jack is unavailable)

- Cloudflare account credentials for `Cse110piedpiper7@gmail.com` are stored in [shared password manager / location — fill this in]
- Any team member with GitHub org admin can update the `TOKEN_CICD_V1` secret
- Any team member with Cloudflare account access can roll the API token

---

## What is NOT a secret (safe to commit)

These identify resources but do not grant access on their own:

- Cloudflare account ID: `c2385380ae01d22783ac5c08274f39d1`
- D1 database ID: `c65d1f5e-5f88-4381-958b-fbbcbb1c00f0`
- Worker URLs (`watchtower-ingest.cse110piedpiper7.workers.dev`, etc.)
- Project IDs (`wt_demo`)

These already live in `workers/*/wrangler.jsonc` and `cli/commands/deploy.js` and are fine there.

---

## If a secret leaks

1. **Revoke immediately** in the Cloudflare dashboard (My Profile → API Tokens → Delete)
2. Generate a replacement with the same scope/permissions
3. Update the GitHub secret with the new value
4. Audit Cloudflare's Audit Log (Account → Manage Account → Audit Logs) for unauthorized deploys
5. Audit GitHub Actions run history for unauthorized workflow runs
6. Communicate to the team in `#devops`

---

## Recommendations

- **Set an expiration on `TOKEN_CICD_V1`** — 6 months. Forces a rotation cadence and limits the blast radius if the token leaks. To do: roll the token, set TTL during creation.
- **Audit token permissions** — current token has more permissions than strictly needed (Workers KV / R2 / Tail came from the template default). Trimming to `Workers Scripts: Edit + D1: Edit + Account Settings: Read` reduces blast radius if leaked. Lower priority — current scope is account-bounded so leak impact is contained to the team account.

---

## Future secrets to plan for

Tracked here so they don't surface mid-sprint as a surprise:

### `SESSION_SECRET` (Sprint 4/5)

When BE implements authentication, the worker will need a session-signing secret.

- **Stored in**: Cloudflare Worker secret (set via `npx wrangler secret put SESSION_SECRET`)
- **Not** a GitHub Secret — never touches CI, lives only in Cloudflare
- **Generation**: 32 random bytes hex-encoded (`openssl rand -hex 32` or equivalent)
- **Rotation**: roll the secret in Cloudflare, all active sessions invalidate (acceptable for class project)

DevOps provisions this when BE asks. Don't provision speculatively.
