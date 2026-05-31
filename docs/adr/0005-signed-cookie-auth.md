# ADR-0005: Signed-Cookie Authentication for the Dashboard API

## Status
Proposed

## Date
2026-05-27

## Context

The dashboard reporting API (`/api/*` on `workers/api`) serves a human viewing error, performance, and feedback data for projects they own. It needs login (verify email + password against a `users` table at `POST /api/login`), a session (prove the logged-in user on every later request without re-asking the password), and authorization (the user owns the requested `project_id`, else 403). Credentials are our own email + password; ARCHITECTURE 3.4 already excluded third-party providers (OAuth). The ingest path (`POST /ingest`) authenticates with a public `project_id` key and has no user behind it, so it is out of scope here.

The deciding constraint is the deployment topology. The dashboard runs on Cloudflare Pages (`*.pages.dev`) and the API on `watchtower-api...workers.dev`; `pages.dev` and `workers.dev` are separate registrable domains (Public Suffix List), so every dashboard-to-API call is cross-site. A `SameSite=Strict`/`Lax` cookie is not sent on those requests, and a credentialed request cannot use `Access-Control-Allow-Origin: *`. Earlier drafts (`SameSite=Strict` in `endpoints-draft.md`, Sprint 3 `ACAO: *`) predate this.

Two options for carrying the session:

1. Signed `HttpOnly` cookie holding an opaque `session_id`, backed by a `sessions` table.
2. Bearer token in `localStorage`, sent in an `Authorization` header.

The dashboard renders untrusted text (error messages and stack traces from monitored apps), so its XSS surface is real. A `localStorage` token is readable by any script, so an XSS hole steals the session; an `HttpOnly` cookie is not readable by JavaScript, so it survives XSS. The cookie's cost is CSRF, but the cross-site split already forces `SameSite=None`, so we defend CSRF explicitly (below). Revocation also favors a server-side `sessions` table over a self-contained token.

## Decision

Signed session cookie, with this design:

- The cookie carries an HMAC-signed opaque `session_id`; the server verifies the signature, then looks up the `sessions` table. Deleting the row revokes the session.
- Cookie attributes: `HttpOnly; Secure; SameSite=None` (`None` is required for the cross-site dashboard).
- CORS echoes the specific dashboard origin with `Access-Control-Allow-Credentials: true` (no `*`). Revises `endpoints-draft.md` and the Sprint 3 CORS.
- CSRF: `/api/*` requires a custom header (e.g. `X-Watchtower-Auth`). A cross-origin request carrying a custom header forces a CORS preflight, which our origin allowlist grants only to the dashboard, so forged cross-site requests are rejected.
- Passwords hashed with PBKDF2 via Web Crypto `SubtleCrypto` (SHA-256, ~100k iterations, per-user random salt; store salt + iterations + hash). Native to Workers, no dependency; bcrypt/argon2 would need an external dependency for marginal gain.
- `POST /api/login` (`{ email, password }`) verifies, inserts a `sessions` row, sets the cookie, returns `{ user, projects }`. `POST /api/logout` deletes the row and clears the cookie.
- Session lifetime: 7-day absolute `Max-Age`, no sliding renewal in v1.
- Signing secret stored via `wrangler secret`. Users seeded directly into `users`; no self-service registration, no roles.

## Consequences

### Positive
- XSS on the dashboard cannot read or exfiltrate the session (`HttpOnly`).
- Works on the current Pages + `workers.dev` deployment with no new infrastructure.
- Sessions are revocable: logout or killing a leaked session is one row delete.
- No new runtime dependency; PBKDF2 and HMAC are in the Workers Web Crypto API.

### Negative
- `SameSite=None` reopens CSRF, defended only by the custom-header check; an endpoint that forgets it is exposed.
- One `sessions` read per request (indexed by `session_id`; negligible at our scale).
- Credentialed CORS must pin the exact dashboard origin; Pages preview URLs change, so the allowlist needs upkeep.
- PBKDF2 is weaker than argon2id; fine for seeded accounts, not for a public user base.

### Out of Scope
- Self-service signup and roles.
- A custom domain, which would let us use `SameSite=Lax` and drop the custom-header CSRF defense; deferred in Sprint 3.
- Session sliding-renewal; revisit if weekly re-login proves annoying.
