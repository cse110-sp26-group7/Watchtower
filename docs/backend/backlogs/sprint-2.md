# Sprint 2 Backend Backlog (draft, week of May 11 – May 17, 2026)

Status: Draft. Sprint 2 begins at the next sprint planning meeting (Mon May 11, 4:00 PM). Tasks below are carried over from Sprint 1's deferred-implementation list and may be reshuffled or expanded at planning.

Backend team: Theo (Lead), Michael, Bishal, Gabrielle

Inputs from Sprint 1 (target Thursday EOD):
- Sprint 1 Task 1 outputs (event schema, API endpoint sketch, snippet integration design notes) feed Task 3 (snippet implementation) directly.
- Sprint 1 Task 2 (storage selection ADR) defines the persistence target for Task 2 (mock ingestion endpoint) once it evolves past console-log mode.
- Sprint 1 Task 3 (SDK pattern survey) provides reference patterns the snippet implementation can borrow.
- Sprint 1 Task 4 (Frontend/UX sync) feeds the schema's v1 update, which in turn shapes the API contract this sprint implements.

---

## How we work

- Each member claims one of the active tasks below based on strength or interest.
- After claiming, create a GitHub Issue and self-assign. (Label and tracking conventions are still TBD)
- If you get stuck, post in Slack `#backend` or DM me (Theo).

---

## Task summary

| #   | Task                                                     | Owner    | Depends on |
| --- | -------------------------------------------------------- | -------- | ---------- |
| 1   | Ingest Worker dev environment setup (wrangler scaffold)  | Bishal   |            |
| 2   | Mock ingestion endpoint prototype                        | Gabrielle | #1         |
| 3   | Test app snippet (auto-capture + post to ingestion)      | _(open)_ |            |

---

## Tasks

### 1. Ingest Worker dev environment setup

Owner: Bishal (claim preserved from Sprint 1)

Path follows ARCHITECTURE.md §9: the ingest Worker lives at `workers/ingest/`. The reporting API Worker (`workers/api/`) is out of scope for this sprint.

Deliverables:
- `workers/ingest/` directory structure (`src/`, `test/`, `wrangler.jsonc`, `eslint.config.mjs`, `vitest.config.js`)
- `workers/ingest/README.md` with a local dev guide (prereqs, install, `npm run dev`, tests, lint, deploy, env vars / secrets)
- Baseline `package.json`, `.gitignore`, and lint config

Scope:
- Set up Cloudflare Workers via `wrangler` (pinned in devDependencies, no global install required).
- Get the worker running locally via `npm run dev` on `http://localhost:8787`.
- Confirm one hello-world endpoint responds with 200 / `Hello World!`.
- `npm test` (vitest via `@cloudflare/vitest-pool-workers`) and `npm run lint` both pass on the scaffold.

Why ahead of mock ingestion: Task 2 below needs this scaffolding to run on top of.

Reference: [Cloudflare Workers official guide](https://developers.cloudflare.com/workers/get-started/guide/)

---

### 2. Mock ingestion endpoint prototype

Owner: Gabrielle

Deliverables:
- `POST /ingest` handler wired into `workers/ingest/src/index.js` (extend the scaffold's `fetch` handler; split into a separate module if it grows past a screen)
- A local test script (curl or fetch example)
- A brief README section or JSDoc

Scope:
- No real validation or storage; just log the received JSON and return 200.
- No schema validation either. Integration with the schema spec happens once it stabilizes.

Depends on: Sprint 2 Task 1 completion.

---

### 3. Test app snippet (auto-capture + post to ingestion)

Owner: _(open)_

Deliverables:
- `client/watchtower.js` (per ARCHITECTURE.md §9) — capture script that auto-captures `window.onerror` and `unhandledrejection`, and exposes a manual `window.watchtower.captureEvent()` API
- Static hosting setup so the snippet is reachable via a public URL
- A small test app (`/test-app/index.html`) that includes the snippet and triggers errors for end-to-end demo
- A short integration doc (`docs/backend/api/integration.md`) explaining how a Test App embeds the snippet

Scope:
- Pure browser-side, vanilla JS only (per project constraints).
- Implementation can proceed in parallel with Task 2 (use a placeholder URL or local stub during development).
- Final end-to-end demo (error in test app → snippet → backend logs to console) assumes Task 2's mock ingestion endpoint is up.

Inputs from Sprint 1 Task 1: project ID format, manual capture API, send mechanism, and auto-capture scope are decided in Sprint 1 Task 1's design notes. This task implements against those decisions.

Open cross-team decisions (still need team sync before implementation):
- Hosting: Cloudflare Pages static file vs. a Worker route serving the JS. Sync with Tech Lead Kareem on repo structure and DevOps team on deploy pipeline.
- Test app form: bare HTML demo or richer example. Coordinate with frontend team in case they have a dashboard demo that doubles as a test target.
